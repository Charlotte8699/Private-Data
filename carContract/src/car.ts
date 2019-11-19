/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Object, Property } from 'fabric-contract-api';

@Object()
export class Car {

    @Property()
    public color: string;
    public make: string;
    public model: string;
    public docType?: string;
}
