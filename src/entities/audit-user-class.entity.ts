import { Column } from 'typeorm';
import { AuditTimestamp } from './audit-timestamp.entity';

export class AuditUserClass<T> extends AuditTimestamp {
	@Column({
		type: 'uuid',
		length: 36,
		name: 'created_by',
		nullable: false,
		update: false,
	})
	createdBy: T;

	@Column({
		type: 'uuid',
		length: 36,
		name: 'updated_by',
		nullable: false,
	})
	updatedBy: T;

	@Column({
		type: 'uuid',
		length: 36,
		name: 'deleted_by',
		nullable: true,
	})
	deletedBy?: T;
}
