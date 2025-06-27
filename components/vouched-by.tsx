"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';

const logos = [
  { name: 'Akshaya Patra', logo: '/akshaya-patra-logo.png', url: 'https://www.akshayapatra.org' },
  { name: 'Uday Foundation', logo: '/uday-foundation-logo.png', url: 'https://www.udayfoundation.org' },
  { name: 'Annamrita', logo: '/annamrita-logo.png', url: 'https://www.annamrita.org' },
  { name: 'Feeding India', logo: '/feeding-india-logo.png', url: 'https://www.feedingindia.org' },
  { name: 'Rise Against Hunger India', logo: '/rise-india-logo.png', url: 'https://www.riseagainsthungerindia.org' }
];

export default function VouchedBy() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Trusted By Leading NGOs
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We partner with the most respected organizations in food security and hunger relief across India.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center"
        >
          {logos.map((company, index) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="flex justify-center"
            >
              <a href={company.url} target="_blank" rel="noopener noreferrer" className="block relative h-12 w-40">
                <Image
                  src={company.logo}
                  alt={company.name}
                  fill={true}
                  style={{objectFit: 'contain'}}
                />
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
} 