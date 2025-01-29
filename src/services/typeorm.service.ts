import { AuditTimestamp } from "../entities/audit-timestamp.entity";
import { MessageArgsType, UserException } from "nest-clean-response";
import { FindManyOptions, FindOneOptions, FindOptionsSelect, FindOptionsWhere, In, ObjectType, Repository } from "typeorm";
import { UserDto } from "../dto/user.dto";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { BasicMethods } from "./basic-methods.service";
import { PropertyName } from "../types/property-name.type";
import { v4 as uuidv4 } from "uuid";
import async from "async";
import { IDownload } from "../interfaces/download.interface";
import * as ExcelJS from "exceljs";
import { IExcelColumn } from "../interfaces/excel-column.interface";

export abstract class TypeormService<T extends AuditTimestamp> extends BasicMethods {
    public throwException(sProperty: string, sMessage: string, args: MessageArgsType): UserException {
        return new UserException(sProperty, `${this.convertToCamelCase(this.entityName())}${this.convertToPascalCase(sMessage)}`, args);
    }

    public async findById(sId: string): Promise<T | null> {
        return await this.findOne({
            where: {
                id: sId
            }
        } as FindOneOptions<T>);
    }

    public async findOne(oOptions?: FindOneOptions<T>): Promise<T | null> {
        const oRepository = await this.getRepository();

        return await oRepository.findOne(oOptions ?? {});
    }

    public async findMany(oOptions?: FindManyOptions<T>): Promise<Array<T>> {
        const oRepository = await this.getRepository();

        return await oRepository.find(oOptions ?? {});
    }

    public async existBy(oOptions?: FindManyOptions<T>): Promise<boolean> {
        const oRepository = await this.getRepository();

        return await oRepository.exists(oOptions);
    }

    public async existByIdOrFail(sId: string, _withDeleted?: boolean): Promise<boolean> {
        const bResult = await this.existBy({
            where: {
                id: sId,
            } as FindOptionsWhere<T>,
            withDeleted: _withDeleted ?? false,
        });

        if (bResult === false) {
            throw this.throwException('values', 'NotFound', [sId]);
        }

        return bResult;
    }

    public async existByFiltersOrFail(oFilters?: FindOptionsWhere<T>, _withDeleted?: boolean): Promise<boolean> {
        const bResult = await this.existBy({
            where: oFilters ?? {},
            withDeleted: _withDeleted ?? false
        });

        if (bResult === false) {
            throw this.throwException('id', 'NotFound', [Object.values(oFilters)] as unknown as string[]);
        }

        return bResult;
    }

    public async saveAll(_oValue: Array<T>, sIndentifierColumn: PropertyName<T>, oOverwrite: PropertyName<T>[], fIndentifierColumnCallback: (oItem: T) => string, bSelectValues?: boolean): Promise<Array<T>> {
        for (let i = 0; i < _oValue.length; i++) {
            const oItem = _oValue[i];

            if (typeof this['getCurrentUser'] === 'function') {
                const oCurrentUser: UserDto = await this['getCurrentUser']();

                oItem['createdById'] = oCurrentUser.id;
                oItem['createdByUsername'] = oCurrentUser.username;
                oItem['updatedById'] = oCurrentUser.id;
                oItem['updatedByUsername'] = oCurrentUser.username;
            }

            if (typeof this['onBeforeSave'] === 'function') {
                await this['onBeforeSave'](oItem);
            }
        }

        const oRepository = await this.getRepository();

        const oFilters = {};
        const oSelect = {
            id: true,
        };

        oFilters[sIndentifierColumn.toString()] = In(_oValue.map((oItem) => fIndentifierColumnCallback(oItem)));
        oSelect[sIndentifierColumn.toString()] = true;

        const ids = await oRepository.find({
            where: oFilters,
            select: oSelect as FindOptionsSelect<T>,
        });

        const oItemsInsert: Array<T> = [];
        const oItemsUpdate: Array<T> = [];

        for (let i = 0; i < _oValue.length; i++) {
            const oItem = _oValue[i];
            let bFind = false;

            for (let j = 0; j < ids.length; j++) {
                const oSubItem = ids[j];

                if (oSubItem[sIndentifierColumn.toString()] == fIndentifierColumnCallback(oItem)) {
                    oItem['id'] = oSubItem['id'];
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
            await this.insertAll(oRepository, oItemsInsert, sIndentifierColumn, [
                ...oOverwrite,
                ...(typeof this['getCurrentUser'] === 'function' ? ['updatedById', 'updatedByUsername'] : [])
            ] as PropertyName<T>[]);
        }

        if (oItemsUpdate.length > 0) {
            await this.updateAll(oRepository, oItemsUpdate, sIndentifierColumn, [
                ...oOverwrite,
                ...(typeof this['getCurrentUser'] === 'function' ? ['updatedById', 'updatedByUsername'] : [])
            ] as PropertyName<T>[]);
        }

        const oResult: T[] = await this.findMany({
            where: oFilters,
        });

        for (let i = 0; i < oResult.length; i++) {
            if (typeof this['onAfterSave'] === 'function') {
                await this['onAfterSave'](oResult[i]);
            }
        }

        return oResult;
    }

    public async deleteById(sId: string): Promise<boolean> {
        if (typeof this['getCurrentUser'] === 'function') {
            const oCurrentUser: UserDto = await this['getCurrentUser']();

            await this.updateById(sId, {
                deletedById: oCurrentUser.id,
                deletedByUsername: oCurrentUser.username
            } as unknown as QueryDeepPartialEntity<T>);
        }

        if (typeof this['onBeforeDelete'] === 'function') {
            await this['onBeforeDelete'](sId);
        }

        const oRepository = await this.getRepository();

        if (await this.useSoftDelete()) {
            const oData = await this.findById(sId);

            const oProperties: string[] = await this.getOneToManyProperties(this.entity());

            for (const sProperty of oProperties) {
                if ((await oData[sProperty]).length != 0) {
                    throw this.throwException(`${sProperty}`, "InUse", [sId]);
                }
            }

            await oRepository.softDelete(sId);
        } else {
            await oRepository.delete(sId);
        }

        if (typeof this['onAfterDelete'] === 'function') {
            await this['onAfterDelete'](sId);
        }

        return true;
    }

    public async buildTemplateExcelForDownload(): Promise<IDownload> {
        const oWorkbook: ExcelJS.Workbook = new ExcelJS.Workbook();
        const oWorksheet: ExcelJS.Worksheet = oWorkbook.addWorksheet(this.getExcelTemplateName());

        const oColumns: Array<IExcelColumn> = await this.getExcelTemplateColumns();

        oWorksheet.columns = oColumns.map((oItem) => {
            return {
                header: oItem.name + (oItem.required ? ' (*)' : ''),
                key: oItem.key,
                width: oItem.options.width || 10,
                style: {
                    protection: {
                        locked: true,
                    },
                },
            };
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
                if (oItem.type === 'Double') {
                    cell.dataValidation = {
                        type: 'decimal',
                        operator: 'between',
                        formulae: [],
                    };
                    cell.dataValidation.type = 'decimal';
                    cell.dataValidation.operator = 'between';
                }

                if (oItem.type === 'Date') {
                    cell.dataValidation = {
                        type: 'date',
                        formulae: [],
                    };
                }

                if (oItem.type === 'String') {
                    cell.dataValidation = {
                        type: 'textLength',
                        formulae: [],
                    };
                }

                if (cell.dataValidation) {
                    cell.dataValidation.allowBlank = !oItem.required;

                    cell.dataValidation.errorTitle = 'Valor Inválido';
                    cell.dataValidation.error = 'Valor Inválido';
                    cell.dataValidation.showErrorMessage = true;
                }
            });
        });

        oWorksheet.getRow(1).eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'B7C5E4' },
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
                right: { style: 'thin' },
            };
        });

        return {
            content: Buffer.from(await oWorkbook.xlsx.writeBuffer()),
            name: `${this.getExcelTemplateName()}.xlsx`,
        };
    }

    public async uploadTemplateExcel(oBufferFile: Buffer): Promise<boolean> {
        throw this.throwException('file', 'serviceNoAvailable', ['uploadTemplateExcel']);
    }

    protected async processTemplateExcel(oBufferFile: Buffer, nStart?: number): Promise<ExcelJS.Row[]> {
        const oWorkbook: ExcelJS.Workbook = new ExcelJS.Workbook();

        await oWorkbook.xlsx.load(oBufferFile);

        const oWorksheet: ExcelJS.Worksheet = oWorkbook.getWorksheet(this.getExcelTemplateName());

        return oWorksheet.getRows(nStart ?? 2, oWorksheet.rowCount - 1).filter((oItem: ExcelJS.Row) => {
            return (oItem.values as []).length > 0;
        });
    }

    protected abstract getRepository(): Promise<Repository<T>>;

    protected abstract useSoftDelete(): Promise<boolean>;

    protected abstract entity(): ObjectType<T>;

    protected getExcelTemplateName(): string | null {
        throw this.throwException('file', 'serviceNoAvailable', ['getExcelTemplateName']);
    }

    protected getExcelTemplateColumns(): Promise<Array<IExcelColumn> | null> {
        throw this.throwException('file', 'serviceNoAvailable', ['getExcelTemplateColumns']);
    }

    protected convertToPascalCase(sValue: string): string {
        return sValue.at(0).toUpperCase() + sValue.substring(1);
    }

    protected convertToCamelCase(sValue: string): string {
        return sValue.at(0).toUpperCase() + sValue.substring(1);
    }

    public async save(oValue: T): Promise<T> {
        const oRepository = await this.getRepository();

        if (typeof this['getCurrentUser'] === 'function') {
            const oCurrentUser: UserDto = await this['getCurrentUser']();

            oValue['createdById'] = oCurrentUser.id;
            oValue['createdByUsername'] = oCurrentUser.username;
            oValue['updatedById'] = oCurrentUser.id;
            oValue['updatedByUsername'] = oCurrentUser.username;
        }

        if (typeof this['onBeforeSave'] === 'function') {
            await this['onBeforeSave'](oValue);
        }

        const { id } = await oRepository.save(oValue);

        if (typeof this['onAfterSave'] === 'function') {
            await this['onAfterSave'](oValue);
        }

        return await this.findOne({
            where: {
                id: id
            } as FindOptionsWhere<T>
        });
    }

    public async updateById(sId: string, oValue: QueryDeepPartialEntity<T>): Promise<T> {
        if (typeof this['getCurrentUser'] === 'function') {
            const oCurrentUser: UserDto = await this['getCurrentUser']();

            oValue['updatedById'] = oCurrentUser.id;
            oValue['updatedByUsername'] = oCurrentUser.username;
        }

        if (typeof this['onBeforeUpdate'] === 'function') {
            await this['onBeforeUpdate'](sId, oValue);
        }

        const oRepository = await this.getRepository();

        await oRepository.createQueryBuilder()
            .update()
            .set(oValue as QueryDeepPartialEntity<T>)
            .where('id = :sId', { sId })
            .execute();

        const oFind: T = await this.findOne({
            where: {
                id: sId
            } as FindOptionsWhere<T>
        });

        if (typeof this['onAfterUpdate'] === 'function') {
            await this['onAfterUpdate'](oFind);
        }

        return oFind;
    }

    private entityName(): string {
        const eValue = this.entity();
        return eValue.name;
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
        }), 'updated_at', sIndentifierColumnName].filter((oItem) => typeof oItem === 'string');

        await async.forEachLimit(this.chunkList(oValue, 500), 10, async (oItem: Array<T>, callback) => {
            await oRepository.createQueryBuilder()
                .insert()
                .into(this.entity())
                .values(oItem as QueryDeepPartialEntity<T>[])
                .orUpdate(oOverwrite, [sIndentifierColumnName], {
                    upsertType: 'on-conflict-do-update',
                }).execute();

            callback(null);
        });
    }

    private async updateAll(oRepository: Repository<T>, _oValue: Array<T>, sIndentifierColumn: PropertyName<T>, overwrite: PropertyName<T>[]) {
        const dbType = oRepository.manager.connection.options.type;

        if (dbType === 'mysql' || dbType === 'mariadb') {
            await async.forEachLimit(this.chunkList(_oValue, 1), 4, async (oItem: Array<T>, callback) => {
                await oRepository.save(oItem, {
                    chunk: 500,
                });

                callback(null);
            });
        } else if (dbType === 'postgres') {
            await this.insertAll(oRepository, _oValue, sIndentifierColumn, overwrite);
        }
    }
}