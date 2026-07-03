import { ContentService } from '../domain/content/service';
import { DiscoveryService } from '../domain/discovery/service';
import { FeedbackService } from '../domain/feedback/service';
import { D1ContentRepository } from '../repositories/d1/content-repository';
import { D1DiscoveryRepository } from '../repositories/d1/discovery-repository';
import { D1FeedbackRepository } from '../repositories/d1/feedback-repository';

export type FinderNycServices = {
  content: ContentService;
  discovery: DiscoveryService;
  feedback: FeedbackService;
};

export function createFinderNycServices(db: D1Database): FinderNycServices {
  return {
    content: new ContentService(new D1ContentRepository(db)),
    discovery: new DiscoveryService(new D1DiscoveryRepository(db)),
    feedback: new FeedbackService(new D1FeedbackRepository(db)),
  };
}
