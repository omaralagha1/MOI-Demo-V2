import type { NextConfig } from 'next';

const englishFirst = [{ type: 'header' as const, key: 'accept-language', value: '^\\s*en.*' }];

const nextConfig:NextConfig={
  poweredByHeader:false,
  experimental:{ globalNotFound:true },
  async redirects(){return [
    // Arabic is the primary language; browsers that prefer English start in English.
    {source:'/',has:englishFirst,destination:'/en',permanent:false},
    {source:'/',destination:'/ar',permanent:false},
    // Certificate QR codes encode /verify/<id>; keep those links working with a localized page.
    {source:'/verify/:id',has:englishFirst,destination:'/en/verify/:id',permanent:false},
    {source:'/verify/:id',destination:'/ar/verify/:id',permanent:false},
  ];},
  async headers(){return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'Content-Security-Policy',value:"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"}
  ]}];}
};
export default nextConfig;
