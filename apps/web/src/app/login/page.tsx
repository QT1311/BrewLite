import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: 'Đăng nhập — BrewLite' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <section className="container">
      <AuthForm mode="login" next={next} />
    </section>
  );
}
