import { User } from './User';
import { Role } from './Role';
import { ServiceType } from './ServiceType';
import { Service } from './Service';
import { GalleryItem } from './GalleryItem';
import { ContactInfo } from './ContactInfo';
import { SocialLink } from './SocialLink';
import { Review } from './Review';

export const models = {
  User,
  Role,
  // Public content for the landing page — see features/keystone/models/shared.ts
  ServiceType,
  Service,
  GalleryItem,
  ContactInfo,
  SocialLink,
  Review,
};

export default models;
