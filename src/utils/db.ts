import 'dotenv/config';
import { MongoClient } from 'mongodb';

export const client = new MongoClient(<string>process.env.DB_URI);
