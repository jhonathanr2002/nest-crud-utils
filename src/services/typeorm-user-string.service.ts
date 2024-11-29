import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AuditUserString } from '../entities/audit-user-string.entity';
import { TypeormService } from './typeorm.service';
import { PropertyName } from '../types/property-name.type';
import { UserDto } from '../dto/user.dto';

export abstract class TypeormUserStringService<T extends AuditUserString> extends TypeormService<T> {
    protected abstract getCurrentUser(): Promise<UserDto>;

    protected async prepareSave(oValue: T) {
        const oCurrentUser = await this.getCurrentUser();

        oValue.createdById = oCurrentUser.id;
        oValue.createdByUsername = oCurrentUser.username;
        oValue.updatedById = oCurrentUser.id;
        oValue.updatedByUsername = oCurrentUser.username;
    }

    protected async save(oValue: T): Promise<T> {
        await this.prepareSave(oValue);

        return await super.save(oValue);
    }

    public async saveAll(_oValue: Array<T>, sIndentifierColumn: PropertyName<T>, overwrite: PropertyName<T>[], fIndentifierColumnCallback: (oItem: T) => string, bSelectValues?: boolean): Promise<Array<T>> {
        for (let i = 0; i < _oValue.length; i++) {
            const oItem = _oValue[i];

            await this.prepareSave(oItem);
        }

        return await super.saveAll(_oValue, sIndentifierColumn, [
            ...overwrite,
            'updatedById',
            'updatedByUsername'
        ], fIndentifierColumnCallback, bSelectValues);
    }

    protected async prepareUpdate(oValue: QueryDeepPartialEntity<T>) {
        const oCurrentUser = await this.getCurrentUser();

        oValue['updatedById'] = oCurrentUser.id;
        oValue['updatedByUsername'] = oCurrentUser.username;
    }

    protected async updateById(sId: string, oValue: QueryDeepPartialEntity<T>): Promise<T> {
        await this.prepareUpdate(oValue);

        return await super.updateById(sId, oValue);
    }

    public async deleteById(sId: string): Promise<boolean> {
        const oCurrentUser = await this.getCurrentUser();

        if (await this.useSoftDelete()) {
            await this.updateById(sId, {
                deletedById: oCurrentUser.id,
                deletedByUsername: oCurrentUser.username,
            } as unknown as QueryDeepPartialEntity<T>);
        }

        return await super.deleteById(sId);
    }
}
