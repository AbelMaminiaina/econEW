import React from 'react';
import Link from 'next/link';

// « Product Banner » du template : deux grandes bannières image (sous les produits à la une).
export function ProductBanners() {
  return (
    <div className="container-fluid py-5">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-6 wow fadeInLeft" data-wow-delay="0.1s">
            <div className="bg-primary rounded position-relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/electro/img/product-banner.jpg" className="img-fluid w-100 rounded" alt="" />
              <div
                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4"
                style={{ background: 'rgba(255, 255, 255, 0.5)' }}
              >
                <h3 className="display-5 text-primary">
                  Tout le catalogue <br /> <span>en un clic</span>
                </h3>
                <p className="fs-4 text-muted">Tarifs dégressifs par quantité</p>
                <Link href="/produits" className="btn btn-primary rounded-pill align-self-start py-2 px-4">
                  Voir le catalogue
                </Link>
              </div>
            </div>
          </div>
          <div className="col-lg-6 wow fadeInRight" data-wow-delay="0.2s">
            <div className="text-center bg-primary rounded position-relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/electro/img/product-banner-2.jpg" className="img-fluid w-100" alt="" />
              <div
                className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4"
                style={{ background: 'rgba(242, 139, 0, 0.5)' }}
              >
                <h2 className="display-2 text-secondary">PRO</h2>
                <h4 className="display-5 text-white mb-4">Paiement Mobile Money</h4>
                <Link href="/inscription" className="btn btn-secondary rounded-pill align-self-center py-2 px-4">
                  Créer un compte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductBanners;
