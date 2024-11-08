import * as ExcelJS from 'exceljs';
import { v4 as uuidv4 } from 'uuid';
import { FindManyOptions, FindOneOptions, FindOperator, FindOptionsSelect, FindOptionsWhere, In, ObjectType, Repository } from "typeorm";
import { AuditTimestamp } from "../entities/audit-timestamp.entity";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { PropertyName } from "../types/property-name.type";
import { BasicMethods } from './basic-methods.service';
import async from "async";
import { IExcelColumn } from '../interfaces/excel-column.interface';
import { IExcelDownload } from '../interfaces/excel-download.interface';
import { UserException } from 'nest-clean-response';

export abstract class TypeormService<T extends AuditTimestamp> extends BasicMethods {
    protected abstract getRepository(): Promise<Repository<T>>;
    protected abstract useSoftDelete(): Promise<boolean>;
    protected abstract entity(): ObjectType<T>;

    private entityName(): string {
        const eValue = this.entity();

        return eValue.name;
    }

    public throwException(sProperty: string, sMessage: string, oValues: string[]): UserException {
        return new UserException(sProperty, `${this.getFormatEntityName()}${sMessage}`, oValues);
    }

    protected getFormatEntityName(): string {
        const sValue: string = this.entityName();

        return sValue.at(0).toLowerCase() + sValue.substring(1);
    }

    public async findOne(oOptions?: FindOneOptions<T>): Promise<T | null> {
        const oRepository = await this.getRepository();

        return (await oRepository.findOne(oOptions ?? {})) ?? null;
    }

    public async findMany(oOptions?: FindManyOptions<T>): Promise<Array<T>> {
        const oRepository = await this.getRepository();

        return await oRepository.find(oOptions ?? {});
    }

    public async findById(sId: string): Promise<T | null> {
        return await this.findOne({
            where: {
                id: sId
            } as FindOptionsWhere<T>
        });
    }

    public async existBy(oOptions?: FindManyOptions<T>): Promise<boolean> {
        const oRepository = await this.getRepository();

        return await oRepository.exists(oOptions);
    }

    public async existById(sId: string, _withDeleted?: boolean): Promise<boolean> {
        return await this.existBy({
            where: {
                id: In(sId as unknown as FindOperator<string>)
            } as FindOptionsWhere<T>,
            withDeleted: _withDeleted ?? false
        });
    }

    public async existByOrFail(oFilters?: FindManyOptions<T>): Promise<boolean> {
        const bResult = await this.existBy(oFilters);

        if (bResult === false) {
            throw this.throwException("values", "NotFound", Object.values(oFilters))
        }

        return bResult;
    }

    public async existByIdOrFail(sId: string, _withDeleted?: boolean): Promise<boolean> {
        return await this.existByOrFail({
            where: {
                id: sId
            } as FindOptionsWhere<T>,
            withDeleted: _withDeleted ?? false
        });
    }

    protected async save(oValue: T): Promise<T> {
        const oRepository = await this.getRepository();

        const { id } = await oRepository.save(oValue);

        return await this.findById(id);
    }

    protected async checkBeforeUpdate(sId: string): Promise<boolean> {
        return await this.existByIdOrFail(sId);
    }

    protected async updateById(sId: string, oValue: QueryDeepPartialEntity<T>): Promise<T> {
        await this.checkBeforeUpdate(sId);

        const oRepository = await this.getRepository();

        await oRepository.createQueryBuilder()
            .update()
            .set(oValue)
            .where("id = :sId", { sId })
            .execute();

        return await this.findById(sId);
    }

    protected async checkBeforeDelete(sId: string): Promise<boolean> {
        await this.existByIdOrFail(sId);

        const oEntity = await this.findById(sId);

        const oRelationsOneToMany = await this.getOneToManyProperties(this.entity());

        for (let i = 0; i < oRelationsOneToMany.length; i++) {
            const key = oRelationsOneToMany[i];
            const nElements = (await oEntity[key]).length;

            if (nElements > 0) {
                throw this.throwException("id", key + "InUse", [nElements]);
            }
        }

        return true;
    }

    public async deleteById(sId: string): Promise<boolean> {
        await this.checkBeforeDelete(sId);

        const oRepository = await this.getRepository();

        if (await this.useSoftDelete()) {
            await oRepository.softDelete(sId);
        } else {
            await oRepository.delete(sId);
        }

        return true;
    }

    private async insertAll(oRepository: Repository<T>, _oValue: Array<T>, sIndentifierColumn: PropertyName<T>, overwrite: PropertyName<T>[]) {
        const oValue = _oValue.map((oItem) => {
            if (!oItem.id) {
                oItem.id = uuidv4();
            }

            if (!oItem.createdAt) {
                oItem.createdAt = new Date();
            }

            if (!oItem.updatedAt) {
                oItem.updatedAt = new Date();
            }

            return oItem;
        });

        const sIndentifierColumnName = this.getColumnByPropertyName(this.entity(), sIndentifierColumn);

        const oOverwrite = [...([...overwrite] as PropertyName<T>[]).map((sItem) => {
            return this.getColumnByPropertyName(this.entity(), sItem);
        }), 'updated_at', 'updated_by_id', 'updated_by_username', sIndentifierColumnName].filter((oItem) => typeof oItem === "string");

        await async.forEachLimit(this.chunkList(oValue, 500), 10, async (oItem: Array<T>, callback) => {
            await oRepository.createQueryBuilder()
                .insert()
                .into(this.entity())
                .values(oItem as QueryDeepPartialEntity<T>[])
                .orUpdate(oOverwrite, [sIndentifierColumnName], {
                    upsertType: "on-conflict-do-update"
                }).execute();

            callback(null);
        });
    }

    private async updateAll(oRepository: Repository<T>, _oValue: Array<T>, sIndentifierColumn: PropertyName<T>, overwrite: PropertyName<T>[]) {
        const dbType = oRepository.manager.connection.options.type;

        if (dbType === "mysql" || dbType === "mariadb") {
            await async.forEachLimit(this.chunkList(_oValue, 1), 4, async (oItem: Array<T>, callback) => {
                await oRepository.save(oItem, {
                    chunk: 500
                });

                callback(null);
            });
        } else if (dbType === "postgres") {
            await this.insertAll(oRepository, _oValue, sIndentifierColumn, overwrite);
        }
    }

    public async saveAll(_oValue: Array<T>, sIndentifierColumn: PropertyName<T>, overwrite: PropertyName<T>[], fIndentifierColumnCallback: (oItem: T) => string, bSelectValues?: boolean): Promise<Array<T>> {
        const oRepository = await this.getRepository();

        const oFilters = {};
        const oSelect = {
            id: true
        };

        oFilters[sIndentifierColumn.toString()] = In(_oValue.map((oItem) => fIndentifierColumnCallback(oItem)));
        oSelect[sIndentifierColumn.toString()] = true;

        const ids = await oRepository.find({
            where: oFilters,
            select: oSelect as FindOptionsSelect<T>
        });

        const oItemsInsert: Array<T> = [];
        const oItemsUpdate: Array<T> = [];

        for (let i = 0; i < _oValue.length; i++) {
            const oItem = _oValue[i];
            let bFind = false;

            for (let j = 0; j < ids.length; j++) {
                const oSubItem = ids[j];

                if (oSubItem[sIndentifierColumn.toString()] == fIndentifierColumnCallback(oItem)) {
                    oItem["id"] = oSubItem["id"];
                    bFind = true;

                    break;
                }
            }

            if (bFind === true) {
                oItemsUpdate.push(oItem);
            } else {
                oItemsInsert.push(oItem);
            }
        }

        if (oItemsInsert.length > 0) {
            await this.insertAll(oRepository, oItemsInsert, sIndentifierColumn, overwrite);
        }

        if (oItemsUpdate.length > 0) {
            await this.updateAll(oRepository, oItemsUpdate, sIndentifierColumn, overwrite);
        }

        if (bSelectValues !== false) {
            return await this.findMany({
                where: oFilters
            });
        } else {
            return [];
        }
    }

    protected getExcelTemplateName(): string | null {
        throw this.throwException('file', "serviceNoAvailable", ["getExcelTemplateName"]);
    }

    protected async getExcelTemplateColumns(): Promise<Array<IExcelColumn> | null> {
        throw this.throwException('file', "serviceNoAvailable", ["getExcelTemplateColumns"]);
    }

    public async buildTemplateExcelForDownload(): Promise<IExcelDownload> {
        const oWorkbook: ExcelJS.Workbook = new ExcelJS.Workbook();
        const oWorksheet: ExcelJS.Worksheet = oWorkbook.addWorksheet(this.getExcelTemplateName());

        const oColumns: Array<IExcelColumn> = await this.getExcelTemplateColumns();

        oWorksheet.columns = oColumns.map((oItem) => {
            return {
                header: oItem.name + (oItem.required ? " (*)" : ""),
                key: oItem.key,
                width: oItem.options.width || 10,
                style: {
                    protection: {
                        locked: true
                    }
                }
            }
        });

        const _oValue = {};

        oColumns.forEach((oItem) => {
            _oValue[oItem.key] = null;
        });

        for (let i = 0; i < 1000; i++) {
            oWorksheet.addRow(_oValue);
        }

        oColumns.forEach((oItem, i) => {
            oWorksheet.columns[i].eachCell((cell, rowNumber) => {
                if (oItem.type === "Double") {
                    cell.dataValidation = {
                        type: "decimal",
                        operator: "between",
                        formulae: []
                    };
                    cell.dataValidation.type = "decimal";
                    cell.dataValidation.operator = "between";
                }

                if (oItem.type === "Date") {
                    cell.dataValidation = {
                        type: "date",
                        formulae: []
                    };
                }

                if (oItem.type === "String") {
                    cell.dataValidation = {
                        type: "textLength",
                        formulae: []
                    };
                }

                if (cell.dataValidation) {
                    cell.dataValidation.allowBlank = !oItem.required;

                    cell.dataValidation.errorTitle = "Valor Inválido";
                    cell.dataValidation.error = "Valor Inválido";
                    cell.dataValidation.showErrorMessage = true;
                }
            });
        });

        oWorksheet.getRow(1).eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'B7C5E4' }
            };

            cell.font = {
                bold: true,
                size: 12,
                //color: { argb: 'FFFFFFFF' }
            };

            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        return {
            content: await oWorkbook.xlsx.writeBuffer(),
            name: `${this.getExcelTemplateName()}.xlsx`,
        };
    }

    protected async processTemplateExcel(oBufferFile: Buffer): Promise<ExcelJS.Row[]> {
        const oWorkbook: ExcelJS.Workbook = new ExcelJS.Workbook();

        await oWorkbook.xlsx.load(oBufferFile);

        const oWorksheet: ExcelJS.Worksheet = oWorkbook.getWorksheet(this.getExcelTemplateName());

        return oWorksheet.getRows(2, oWorksheet.rowCount - 1);
    }

    public async uploadTemplateExcel(oBufferFile: Buffer): Promise<boolean> {
        throw this.throwException('file', "serviceNoAvailable", ["uploadTemplateExcel"]);
    }
}
