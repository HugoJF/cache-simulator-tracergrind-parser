// eslint-disable-next-line @typescript-eslint/no-redeclare
declare global {
    interface BigInt {
        /** Convert to BigInt to string form in JSON.stringify */
        toJSON: () => string;
    }
}

BigInt.prototype.toJSON = function () {
    return `0x${this.toString(16)}`;
};
