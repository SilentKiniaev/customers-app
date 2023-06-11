import { faker } from '@faker-js/faker';
import { client } from './utils/db';
import { ICustomer } from './interfaces/customer.interface';

async function sync() {
  const maxBufferLength = 1000;
  const timeLimitMs = 1000;
  await client.connect().then(() => console.log(`Sync: DB is started`));
  if (process.argv.includes('--full-reindex')) {
    await runFullSync();
    process.exit(0);
  } else await runRealtimeSync(maxBufferLength, timeLimitMs);
}

async function runRealtimeSync(maxBufferLength = 1000, timeLimitMs = 1000) {
  async function syncCustomers() {
    try {
      const buffer: ICustomer[] = [];
      const syncedLength = await countSyncedCustomers();
      const start = performance.now();
      while (performance.now() - start < timeLimitMs && buffer.length < maxBufferLength) {
        await client
          .db()
          .collection<ICustomer>('customers')
          .find(
            {},
            {
              skip: syncedLength + buffer.length,
              limit: maxBufferLength - buffer.length,
            },
          )
          .toArray()
          .then((data) => replaceSensativeData(data))
          .then((data) => buffer.push(...data));
      }

      if (buffer.length) {
        const syncedLengthCheck = await countSyncedCustomers();
        if (syncedLengthCheck === syncedLength)
          await client.db().collection<ICustomer>('customers_anonymised').insertMany(buffer);
      }
    } catch (e) {
      console.log('>>>>>> sync error:', e);
    } finally {
      setTimeout(syncCustomers);
    }
  }

  await syncCustomers();
}

async function runFullSync() {
  try {
    const syncedLength = await countSyncedCustomers();
    const buffer: ICustomer[] = [];
    await client
      .db()
      .collection<ICustomer>('customers')
      .find(
        {},
        {
          skip: syncedLength,
        },
      )
      .toArray()
      .then((data) => replaceSensativeData(data))
      .then((data) => buffer.push(...data));

    if (buffer.length) {
      const syncedLengthCheck = await countSyncedCustomers();
      if (syncedLengthCheck === syncedLength)
        await client.db().collection<ICustomer>('customers_anonymised').insertMany(buffer);
    }
  } catch (e) {
    console.log('>>>>>> sync error:', e);
  }
}

function replaceSensativeData(customers: ICustomer[]) {
  const copyCustomers: ICustomer[] = JSON.parse(JSON.stringify(customers));
  for (const customer of copyCustomers) {
    customer.firstName = generateAnonPharse();
    customer.lastName = generateAnonPharse();
    customer.email = customer.email.replace(/.+(@.+)/, `${generateAnonPharse()}$1`);
    customer.address.line1 = generateAnonPharse();
    customer.address.line2 = generateAnonPharse();
    customer.address.postcode = generateAnonPharse();
  }

  return copyCustomers;
}

function generateAnonPharse(): string {
  return faker.internet.password({ length: 8, pattern: /[a-zA-Z\d]/ });
}

async function countSyncedCustomers(): Promise<number> {
  return client.db().collection<ICustomer>('customers_anonymised').countDocuments();
}

sync();
