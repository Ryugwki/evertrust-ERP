import { Module } from '@nestjs/common';
import { LineItemsController } from './line-items.controller';
import { PricingController } from './pricing.controller';
import { LineItemsService } from './line-items.service';
import { ObservationsService } from './observations.service';
import { PricingService } from './pricing.service';
import { PricingTenantService } from './pricing-tenant.service';

// Phase 5a pricing core: LV line items, price observations (evidence), and the
// deterministic pricing engine surfaced over HTTP. The DB client is provided
// globally by DbModule; these services just consume it.
@Module({
  controllers: [LineItemsController, PricingController],
  providers: [
    LineItemsService,
    ObservationsService,
    PricingService,
    PricingTenantService,
  ],
})
export class PricingModule {}
