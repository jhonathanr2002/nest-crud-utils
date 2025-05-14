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
        type: "timestamp"
    })
    createdAt: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        nullable: false,
        type: "timestamp"
    })
    updatedAt: Date;

    @DeleteDateColumn({
        name: 'deleted_at',
        nullable: true,
        type: "timestamp"
    })
    deletedAt: Date | null;
}
