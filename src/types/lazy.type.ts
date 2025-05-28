import {Relation} from "typeorm";

export type LazyType<T> = Promise<Relation<T>> | Partial<Relation<T>>;
