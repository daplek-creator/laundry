import heroImg from './images/hero_fresh_laundry_1791598870308.jpg';
import heroNavyImg from './images/hero_navy_laundry_studio_1791600302359.jpg';
import heroOpt1Washer from './images/hero_opt1_blue_washer_1791600979653.jpg';
import heroOpt2Towels from './images/hero_opt2_clean_towels_1791600990710.jpg';
import heroOpt3Dark from './images/hero_opt3_dark_boutique_1791601002060.jpg';
import washFoldImg from './images/service_wash_fold_1791598882417.jpg';
import steamIronImg from './images/service_steam_iron_1791598898470.jpg';
import beddingCareImg from './images/service_bedding_care_1791598909952.jpg';
import expressCareImg from './images/service_express_care_1791600314725.jpg';
import cardCuciKeringRack from './images/card_cuci_kering_rack_1791601014190.jpg';
import cardCuciSetrikaPress from './images/card_cuci_setrika_press_1791601026013.jpg';

export const BRAND_IMAGES = {
  hero: heroImg,
  hero_navy: heroNavyImg,
  heroNavyStudio: heroNavyImg,
  hero_opt1: heroOpt1Washer,
  heroOption1Washer: heroOpt1Washer,
  hero_opt2: heroOpt2Towels,
  hero_opt3: heroOpt3Dark,
  wash_fold: cardCuciKeringRack,
  washFold: cardCuciKeringRack,
  steam_iron: cardCuciSetrikaPress,
  steamIron: cardCuciSetrikaPress,
  bedding_care: beddingCareImg,
  beddingCare: beddingCareImg,
  express_care: expressCareImg,
  expressCare: expressCareImg,
  folded_stack: washFoldImg,
  hanging_suits: steamIronImg,
} as const;

export const SERVICE_IMAGE_MAP: Record<string, string> = {
  wash_fold: BRAND_IMAGES.wash_fold,
  steam_iron: BRAND_IMAGES.steam_iron,
  bedding_care: BRAND_IMAGES.bedding_care,
  express_care: BRAND_IMAGES.express_care,
};

export type ServiceImageKey = 'wash_fold' | 'steam_iron' | 'bedding_care' | 'express_care';

export function getServiceImage(key?: string): string {
  if (key && key in BRAND_IMAGES) {
    return BRAND_IMAGES[key as keyof typeof BRAND_IMAGES];
  }
  return BRAND_IMAGES.wash_fold;
}
