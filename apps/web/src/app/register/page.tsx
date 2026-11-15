import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Đăng ký — BrewLite' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <section className="container">
      <AuthForm mode="register" next={next} />
    </section>
  );
}
