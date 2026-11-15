import { StaffBoard } from '@/components/StaffBoard';

export const metadata = { title: 'Quầy — BrewLite' };

export default function StaffPage() {
  return (
    <section className="container">
      <h1 className="section-title page-title">Quầy pha chế</h1>
      <StaffBoard />
    </section>
  );
}
