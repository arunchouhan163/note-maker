import { Prop, getModelForClass, modelOptions } from '@typegoose/typegoose';
import { Schema } from 'mongoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class User {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  password!: string;
}

export const UserModel = getModelForClass(User);
export const UserSchema = UserModel.schema as Schema; 