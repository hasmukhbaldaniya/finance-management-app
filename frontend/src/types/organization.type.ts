export type Organization = {
  id: number;
  name: string;
  gstNumber: string;
};

export type OrganizationMembership = Organization & {
  isActive: boolean;
};
