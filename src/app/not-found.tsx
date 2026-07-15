import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata:Metadata={title:"Page not found",robots:{index:false,follow:false}};

export default function NotFound(){return <main className="errorPage"><SearchX/><span>404 / NOT FOUND</span><h1>الصفحة غير موجودة<br/><small>Page not found</small></h1><p>تحقق من الرابط أو عُد إلى الصفحة الرئيسية.<br/>Check the address or return to the home page.</p><div className="heroActions"><Link className="primaryButton" href="/ar">الرئيسية العربية</Link><Link className="secondaryButton" href="/en">English home</Link></div></main>}

