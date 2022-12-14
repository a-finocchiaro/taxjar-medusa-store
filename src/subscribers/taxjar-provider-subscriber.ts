import { EventBusService, NoteService, OrderService, TaxProviderService } from "@medusajs/medusa";
import { EntityManager } from "typeorm";
import { ITaxService } from "../interfaces";

type InjectedDependencies = { 
  eventBusService: EventBusService;
  orderService: OrderService;
  manager: EntityManager;
  taxProviderService: TaxProviderService;
  noteService: NoteService;
}

class TaxProviderSubscriber {
  
  private readonly manager: EntityManager
  private readonly eventBusService: EventBusService;
  private readonly orderService: OrderService;
  private readonly taxProviderService: TaxProviderService;
  private readonly noteService: NoteService;

  constructor({
    eventBusService,
    manager,
    orderService,
    taxProviderService,
    noteService,
  }: InjectedDependencies) {
    this.eventBusService = eventBusService;
    this.orderService = orderService;
    this.manager = manager;
    this.taxProviderService = taxProviderService;
    this.noteService = noteService;
  
    eventBusService.subscribe(
      OrderService.Events.PLACED, async (order: { id: string}) => {
        await this.createProviderOrder(order)
      }
    );
  }

  async createProviderOrder({ id }: { id: string }): Promise<void> {
    // get the order record
    const order = await this.orderService.retrieve(id, {
      select: ['id', 'subtotal', 'shipping_total', 'tax_total', 'created_at'],
      relations: ['region', 'items', 'shipping_address']
    })

    // return if not using custom tax provider
    if (!order.region.tax_provider_id) {
      return
    }
  
    const taxProvider = this.taxProviderService.retrieveProvider(
      order.region
    ) as ITaxService;

    const taxData = await taxProvider.createTaxOrder(order);

    // if there was a problem writing the order to taxjar, create a note for the admin.
    if (!taxData) {
      await this.noteService.create({
        resource_id: order.id,
        resource_type: 'order',
        value: "There was an issue creating the taxjar order to track sales tax, create in taxjar."
      })
    }
  }
}

export default TaxProviderSubscriber;