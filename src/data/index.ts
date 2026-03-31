// Typed accessors for data-driven configuration
import classicResourceTypes from './classicResourceTypes.json';
import classicRelationships from './classicRelationships.json';
import classicDisplayNames from './classicDisplayNames.json';
import vpcResourceTypes from './vpcResourceTypes.json';
import powerVsResourceTypes from './powerVsResourceTypes.json';
import platformResourceTypes from './platformResourceTypes.json';
import ibmCloudDataCenters from './ibmCloudDataCenters.json';
import ibmCloudRegions from './ibmCloudRegions.json';

export type DataCenterInfo = { lat: number; lng: number; city: string; country: string };
export type DataCenterMap = Record<string, DataCenterInfo>;

export {
  classicResourceTypes,
  classicRelationships,
  classicDisplayNames,
  vpcResourceTypes,
  powerVsResourceTypes,
  platformResourceTypes,
  ibmCloudDataCenters,
  ibmCloudRegions,
};
