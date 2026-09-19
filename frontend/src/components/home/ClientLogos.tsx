import Image from 'next/image';
import { clientLogos } from '@/data/clients';

export function ClientLogos() {
  if (clientLogos.length === 0) return null;

  return (
    <section className="py-12 bg-white border-y border-warm-100" aria-label="Entreprises clientes">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm font-medium uppercase tracking-wide text-warm-500 mb-8">
          Ils nous font confiance
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {clientLogos.map((client) => (
            <li key={client.name}>
              <Image
                src={client.src}
                alt={client.name}
                width={140}
                height={48}
                className="h-10 w-auto object-contain grayscale opacity-70 transition duration-[var(--duration-fast)] hover:grayscale-0 hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default ClientLogos;
