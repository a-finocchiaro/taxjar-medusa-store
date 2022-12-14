import { ITaxService as MedusaITaxService, Order } from "@medusajs/medusa";
import { CreateOrderRes } from "taxjar/dist/types/returnTypes";

export interface ITaxService extends MedusaITaxService {
  createTaxOrder(
    order: Order
  ): Promise<CreateOrderRes | void>
};
