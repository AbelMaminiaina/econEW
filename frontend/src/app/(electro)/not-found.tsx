import Link from 'next/link';
import { PageHeader } from '@/components/electro/PageHeader';

// Page 404 du template Electro (404.html).
export default function NotFound() {
  return (
    <>
      <PageHeader title="404" crumbs={[{ label: 'Page introuvable' }]} />
      <div className="container-fluid py-5">
        <div className="container py-5 text-center">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <i className="fas fa-exclamation-triangle display-1 text-secondary"></i>
              <h1 className="display-1">404</h1>
              <h1 className="mb-4">Page introuvable</h1>
              <p className="mb-4">
                Désolé, la page que vous cherchez n&apos;existe pas sur notre site. Retournez à l&apos;accueil ou
                essayez la recherche.
              </p>
              <Link className="btn btn-primary rounded-pill py-3 px-5" href="/">
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
