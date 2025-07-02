import { Prop, getModelForClass, modelOptions } from '@typegoose/typegoose';
import { Schema } from 'mongoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: Date.now })
  updatedAt!: Date;
}

export const UserModel = getModelForClass(User);
export const UserSchema = UserModel.schema as Schema; 