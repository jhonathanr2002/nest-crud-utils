import {getMetadataArgsStorage} from 'typeorm';
import {PropertyName} from '../types/property-name.type';

export abstract class BasicMethods {
    protected async getOneToManyProperties(oEntity: Function): Promise<string[]> {
        const metadata = getMetadataArgsStorage();

        const oneToManyRelations = metadata.relations.filter(
            relation => relation.target === oEntity && relation.relationType === 'one-to-many',
        );

        return oneToManyRelations.map(relation => relation.propertyName);
    }

    protected getJoinColumnByPropertyName<T>(oEntity: Function, sPropertyName: PropertyName<T>): string {
        const metadata = getMetadataArgsStorage();

        const oColumn = metadata.joinColumns.find(
            (column) => column.target === oEntity && column.propertyName === sPropertyName,
        );

        if (!oColumn) {
            return null;
        }

        return oColumn.name;
    }

    protected getColumnByPropertyName<T>(oEntity: Function, sPropertyName: PropertyName<T>): string {
        const metadata = getMetadataArgsStorage();

        const oColumn = metadata.columns.find(
            (column) => column.target === oEntity && column.propertyName === sPropertyName,
        );

        if (!oColumn) {
            return this.getJoinColumnByPropertyName(oEntity, sPropertyName);
        }

        return oColumn.options.name;
    }

    protected chunkList<T>(list: T[], chunkSize: number = 100): T[][] {
        const result: T[][] = [];

        for (let i = 0; i < list.length; i += chunkSize) {
            result.push(list.slice(i, i + chunkSize));
        }

        return result;
    }
}