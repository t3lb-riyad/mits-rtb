import { useState, useEffect } from 'react';
import { API_BASE } from './api';

export const ALGERIAN_WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Algiers',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', "M'Sila", 'Mascara', 'Ouargla', 'Oran',
  'El Bayadh', 'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf',
  'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla',
  'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane', "El M'Ghair", 'El Meniaa',
  'Ouled Djellal', 'Bordj Baji Mokhtar', 'Béni Abbès', 'Timimoun', 'Touggourt',
  'Djanet', 'In Salah', 'In Guezzam',
];

const BASE_URL = API_BASE.replace(/\/api$/, '');

export function useDeliveryFee(province: string, shippingMethod: string) {
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);

  useEffect(() => {
    if (!province) { setDeliveryFee(null); return; }
    const field = shippingMethod === 'home_delivery' ? 'home_delivery_fee' : 'office_pickup_fee';
    setDeliveryFeeLoading(true);
    fetch(`${BASE_URL}/api/delivery/fees/${encodeURIComponent(province)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setDeliveryFee(data ? Number(data[field]) || 0 : null))
      .catch(() => setDeliveryFee(null))
      .finally(() => setDeliveryFeeLoading(false));
  }, [province, shippingMethod]);

  return { deliveryFee, deliveryFeeLoading };
}
