import { TaxCalculationContext as MedusaTaxCalculationContext } from "@medusajs/medusa";

// overrides
export interface TaxCalculationContext extends MedusaTaxCalculationContext {
  queryApi: boolean;
};

// new types
export type TaxjarToFromData = {
  from_country: string,
  from_zip: string,
  from_state: string,
  from_city: string,
  from_street: string,
  to_country: string;
  to_zip: string;
  to_state: string;
  to_city: string;
  to_street: string;
  
}

export type TaxjarLineItem = {
  id: string,
  quantity: number,
  product_tax_code?: string,
  unit_price: number,
  discount?: number
}

export interface TaxjarCreateOrderData extends TaxjarToFromData {
  transaction_id: string,
  transaction_date: string,
  amount: number,
  shipping: number,
  sales_tax: number,
  line_items: TaxjarLineItem[]
}
