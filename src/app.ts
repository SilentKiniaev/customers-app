import { faker } from '@faker-js/faker';
import { client } from './utils/db';
import { ICustomer } from './interfaces/customer.interface';

async function app() {
  const delayMs = 200;
  await client.connect().then(() => console.log(`App: DB is started`));
  await runCustomersGenerating(delayMs);
}

async function runCustomersGenerating(delayMs = 200) {
  async function generateCustomers() {
    const customers = faker.helpers.multiple(createRandomCustomer, {
      count: Math.round(Math.random() * 9 + 1),
    });
    await client.db().collection<ICustomer>('customers').insertMany(customers);
    setTimeout(generateCustomers, delayMs);
  }
  await generateCustomers();
}

function createRandomCustomer(): ICustomer {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email({ provider: 'doodle.com' }),
    address: {
      line1: faker.location.streetAddress(),
      line2: faker.location.secondaryAddress(),
      postcode: faker.location.zipCode('#####'),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      country: faker.location.countryCode(),
    },
    createdAt: new Date(),
  };
}

app();
