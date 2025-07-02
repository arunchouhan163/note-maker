import { Prop, getModelForClass, modelOptions } from '@typegoose/typegoose';
import { Schema } from 'mongoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Note {
  @Prop({ required: true })
  title!: string;

  @Prop({ type: [String], default: [] })
  items!: string[];

  @Prop({ type: [Number], default: [] })
  completedItems!: number[];

  @Prop({ type: [String], default: [], maxlength: 9 })
  tags!: string[];

  @Prop({ default: '#ffffff' })
  backgroundColor!: string;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ default: false })
  isArchived!: boolean;

  @Prop({ default: false })
  isTrashed!: boolean;

  @Prop({ type: Date })
  trashedAt?: Date;
}

export const NoteModel = getModelForClass(Note);
export const NoteSchema = NoteModel.schema as Schema; 