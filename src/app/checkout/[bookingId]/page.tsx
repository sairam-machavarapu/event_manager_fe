import { Checkout } from "@/components/checkout";
export default async function CheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  return <Checkout bookingId={(await params).bookingId} />;
}
