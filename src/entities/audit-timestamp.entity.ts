import {CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

export class AuditTimestamp {
    @PrimaryGeneratedColumn('uuid', {
        name: 'id',
    })
    id: string;

    @CreateDateColumn({
        name: 'created_at',
        update: false,
        nullable: false,
    })
    createdAt: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        nullable: false,
    })
    updatedAt: Date;

    @DeleteDateColumn({
        name: 'deleted_at',
        nullable: true,
    })
    deletedAt: Date | null;
}
