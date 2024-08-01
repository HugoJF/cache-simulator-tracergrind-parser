import {FC} from "react";

export type AddressProps = {
    children: bigint;
}

export const Address: FC<AddressProps> = ({children}) => {
    return `0x${children.toString(16)}`;
}
