export interface PogCheckinCheckout {
  Comments: string;
  IsCheckedOut: boolean;
  data: PogCheckinCheckoutData[];
}
export interface PogCheckinCheckoutData {
  IDPOG: number;
  Version: string;
}
