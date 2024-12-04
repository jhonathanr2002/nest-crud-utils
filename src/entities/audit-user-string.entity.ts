import {Column} from 'typeorm';
import {AuditTimestamp} from './audit-timestamp.entity';

export class AuditUserString extends AuditTimestamp {
    @Column({
        type: 'uuid',
        name: 'created_by_id',
        nullable: false,
        update: false,
    })
    createdById: string;

    @Column({
        type: 'varchar',
        length: 255,
        name: 'created_by_username',
        nullable: false,
        update: false,
    })
    createdByUsername: string;

    @Column({
        type: 'uuid',
        name: 'updated_by_id',
        nullable: false,
    })
    updatedById: string;

    @Column({
        type: 'varchar',
        length: 255,
        name: 'updated_by_username',
        nullable: false,
    })
    updatedByUsername: string;

    @Column({
        type: 'uuid',
        name: 'deleted_by_id',
        nullable: true,
    })
    deletedById?: string;

    @Column({
        type: 'varchar',
        length: 255,
        name: 'deleted_by_username',
        nullable: true,
    })
    deletedByUsername?: string;
}
