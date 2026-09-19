import React from 'react';
import Link from 'next/link';

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  crumbs: Crumb[];
  description?: string;
}

// « Single Page Header » du template Electro : fond image fixe (.page-header de style.css),
// titre centré et fil d'Ariane Bootstrap.
export function PageHeader({ title, crumbs, description }: PageHeaderProps) {
  return (
    <div className="container-fluid page-header py-5">
      <h1 className="text-center text-white display-6 wow fadeInUp" data-wow-delay="0.1s">
        {title}
      </h1>
      <ol className="breadcrumb justify-content-center mb-0 wow fadeInUp" data-wow-delay="0.3s">
        <li className="breadcrumb-item">
          <Link href="/">Accueil</Link>
        </li>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.label} className={`breadcrumb-item${last ? ' active text-white' : ''}`} aria-current={last ? 'page' : undefined}>
              {crumb.href && !last ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
            </li>
          );
        })}
      </ol>
      {description && <p className="text-center text-white mt-3 mb-0 mx-auto" style={{ maxWidth: 720 }}>{description}</p>}
    </div>
  );
}

export default PageHeader;
