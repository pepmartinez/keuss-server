import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Fully distributed, no SPOF job-queue service',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        Fully distributed, no single point fo failure. HA, persistence, durability,
        all is provided almost directly by the underlying storage
      </>
    ),
  },
  {
    title: 'All Keuss features and guarantees',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        keuss-server builds atop keuss; all of keuss featurea and guarantees are present
      </>
    ),
  },
  {
    title: 'Simple protocols',
    Svg: require('@site/static/img/check-symbol.svg').default,
    description: (
      <>
        Simple, agnostic protocols included: REST and STOMP
      </>
    ),
  },
];


function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
