import { 
  AbstractTaxService,
  Address,
  ItemTaxCalculationLine,
  Order,
  ShippingTaxCalculationLine 
} from "@medusajs/medusa";
import { ProviderTaxLine } from "@medusajs/medusa/dist/types/tax-service";
import Taxjar from "taxjar";
import { TaxForOrderRes, CreateOrderRes } from "taxjar/dist/types/returnTypes";
import { 
  TaxCalculationContext,
  TaxjarCreateOrderData,
  TaxjarLineItem,
  TaxjarToFromData
} from "../types";
import { EntityManager } from "typeorm";
import { MedusaError } from 'medusa-core-utils';

type ConstructorParams = {
  manager: EntityManager;
}

// This is an example source address, replace these values with your own store.
const STORE_ADDRESS = {
  from_country: 'US',
  from_zip: '85007',
  from_state: 'AZ',
  from_city: 'Phoenix',
  from_street: '1700 W Washington St.',
}

export default class TaxjarService extends AbstractTaxService {
  protected static identifier: string = 'taxjar';

  readonly manager: EntityManager;
  private readonly client: Taxjar;

  constructor (container: ConstructorParams) {
    super();
    this.manager_ = container.manager;
    
    this.client = new Taxjar({
      apiKey: process.env.TAXJAR_API_KEY,
      apiUrl: process.env.TAXJAR_URL
    });
  }

  async getTaxLines(
    itemLines: ItemTaxCalculationLine[],
    shippingLines: ShippingTaxCalculationLine[],
    calculationContext: TaxCalculationContext,
  ): Promise<ProviderTaxLine[]> {
    let taxRate = 0;

    if (calculationContext?.shipping_address?.postal_code && itemLines.length > 0 ) {
      const address = this.buildTaxjarData(calculationContext.shipping_address);
      taxRate = await this.fetchTaxRate(
        itemLines,
        shippingLines,
        address
      );
    }

    return this.buildTaxLines(itemLines, shippingLines, taxRate)
  }

  private buildTaxLines(
    itemLines: ItemTaxCalculationLine[],
    shippingLines: ShippingTaxCalculationLine[],
    itemTaxRate?: number) {
      return [
        ...itemLines.map(line => ({
          rate: itemTaxRate,
          name: "Sales tax",
          code: "",
          item_id: line.item.id
        })),
        // Shipping taxes are combined in taxjar since they are combined, always set to
        // 0% here.
        ...shippingLines.map(line => ({
          rate: 0,
          name: "default",
          code: "default",
          shipping_method_id: line.shipping_method.id
        }))
      ];
  }

  private buildTaxjarData(address: Address): TaxjarToFromData {
    return {
      ...STORE_ADDRESS,
      to_country: address.country_code,
      to_zip: address.postal_code,
      to_state: address.province,
      to_city: address.city,
      to_street: address.address_1,
    }
  }

  async fetchTaxRate(
    itemLines: ItemTaxCalculationLine[],
    shippingLines: ShippingTaxCalculationLine[],
    addrInfo
  ): Promise<number> {
    const taxjarLineItems: TaxjarLineItem[] = itemLines.map((line) => ({
      id: line.item.id,
      quantity: line.item.quantity,
      unit_price: line.item.unit_price,
    }))

    // combined cost of all shipping methods (typically will only have 1 here)
    addrInfo.shipping = shippingLines.reduce((acc, line) => {
      return acc += line.shipping_method.price;
    }, 0)

    addrInfo.line_items = taxjarLineItems;

    return await this.client.taxForOrder(addrInfo)
      .then((res) => {
        return res.tax.rate * 100
      })
      .catch((err) => {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Taxjar error: ${err}`
        )
      });
  }

  async createTaxOrder(order: Order): Promise<CreateOrderRes | void> {
    const shippingAddress = this.buildTaxjarData(order.shipping_address);
    const taxjarLineItems: TaxjarLineItem[] = order.items.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      unit_price: line.unit_price,
      product_identifier: line.variant.id
    }));
  
    const taxjarData: TaxjarCreateOrderData = {
      ...shippingAddress,
      line_items: taxjarLineItems,
      transaction_id: order.id,
      transaction_date: order.created_at.toString(),
      amount: order.subtotal + order.shipping_total,
      shipping: order.shipping_total,
      sales_tax: order.tax_total
    };
  
    const res = await this.client.createOrder(taxjarData)
      .catch((err) => {
        return
      });
  
    return res;
  }
}