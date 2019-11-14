/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { ClientIdentity } from 'fabric-shim';
import { Car } from './car';

@Info({title: 'CarContract', description: 'My Smart Contract' })
export class CarContract extends Contract {

    @Transaction(false)
    @Returns('boolean')
    public async carExists(ctx: Context, carId: string): Promise<boolean> {
        const buffer = await ctx.stub.getState(carId);
        return (!!buffer && buffer.length > 0);
    }

    @Transaction()
    public async createCar(ctx: Context, carId: string, value: string): Promise<void> {
        const identity: ClientIdentity = ctx.clientIdentity;
        // Check if the identity has the 'manufacturer' attribute set to 'true'
        const checkAttr: boolean = identity.assertAttributeValue('manufacturer', 'true');
        if (checkAttr) {
            const exists = await this.carExists(ctx, carId);
            if (exists) {
                throw new Error(`The car ${carId} already exists`);
            }
            const car = new Car();
            car.value = value;
            const buffer = Buffer.from(JSON.stringify(car));
            await ctx.stub.putState(carId, buffer);
         } else {
                throw new Error('You must be a manufacturer to carry out this transaction!');
         }
    }

    @Transaction(false)
    @Returns('Car')
    public async readCar(ctx: Context, carId: string): Promise<Car> {
        const exists = await this.carExists(ctx, carId);
        if (!exists) {
            throw new Error(`The car ${carId} does not exist`);
        }
        const buffer = await ctx.stub.getState(carId);
        const car = JSON.parse(buffer.toString()) as Car;
        return car;
    }

    @Transaction()
    public async updateCar(ctx: Context, carId: string, newValue: string): Promise<void> {
        const exists = await this.carExists(ctx, carId);
        if (!exists) {
            throw new Error(`The car ${carId} does not exist`);
        }
        const car = new Car();
        car.value = newValue;
        const buffer = Buffer.from(JSON.stringify(car));
        await ctx.stub.putState(carId, buffer);
    }

    @Transaction()
    public async deleteCar(ctx: Context, carId: string): Promise<void> {
        const exists = await this.carExists(ctx, carId);
        if (!exists) {
            throw new Error(`The car ${carId} does not exist`);
        }
        await ctx.stub.deleteState(carId);
    }

}
