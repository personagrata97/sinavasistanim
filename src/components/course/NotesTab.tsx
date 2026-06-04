"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createPortal } from "react-dom"
import { BookOpen, ChevronRight, Download, FileText, RefreshCw, Loader2, Bookmark, BookmarkCheck, Highlighter, X, Palette, Sparkles, ShieldCheck, AlertCircle, Bot, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeRaw from "rehype-raw"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { EmptyState, LoadingSkeleton, formatTitle, cleanMarkdown, Modal } from "./shared"
import { Tooltip } from "@/components/ui/shared"
import { getBookmarkForCourse, setBookmark, removeBookmark, getHighlightsForSection, getHighlightsForCourse, addHighlight, removeHighlight, getColorClass, type Highlight } from "@/lib/study-marks"
import { PremiumMarkdownRenderer } from "./PremiumMarkdownRenderer"
import { SectionQualityModal } from "@/components/admin/SectionQualityModal"

const PDF_SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  body { font-family: 'Inter', sans-serif; color: #0f172a; padding: 40px; max-width: 800px; margin: 0 auto; background: #f8fafc; }
  .print-bar { position: fixed; top:0; left:0; right:0; background: linear-gradient(135deg, #1e3a5f, #1e40af); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .print-bar span { color: white; font-size: 14px; font-weight: 600; }
  .print-btn { background: linear-gradient(to right, #3b82f6, #4f46e5); color: white; border: none; padding: 10px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; }
  body { padding-top: 56px; }
  @media print { .print-bar { display: none; } body { padding-top: 0; } }
  h2 { font-size: 22px; color: #1e3a5f; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 3px solid #3b82f6; font-weight: 800; }
  h3 { font-size: 15px; color: #1e3a5f; margin: 18px 0 8px; font-weight: 700; }
  p, li { font-size: 13px; line-height: 1.8; color: #334155; }
  ul { list-style: disc; padding-left: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
  th { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-weight: 700; }
  td { border: 1px solid #e2e8f0; padding: 8px 12px; }
  strong { color: #0f172a; }
  .print-section-block { page-break-inside: auto !important; break-inside: auto !important; }
  h1, h2, h3, h4 { page-break-after: avoid !important; break-after: avoid !important; break-after: avoid-page !important; }
  p, div, li, span, tr { orphans: 3 !important; widows: 3 !important; }
`

const ABBREVIATIONS_DICT: Record<string, string> = {
  "IP": "Internet Protocol (İnternet Protokolü. İnternete veya yerel bir ağa bağlı cihazların birbirini tanımasını, iletişim kurmasını ve veri paketlerinin doğru adrese yönlendirilmesini sağlayan eşsiz sayısal adresleme sistemidir)",
  "IT": "Information Technology (Bilgi Teknolojileri. Bilgisayarlar, yazılım, veri depolama, ağlar ve diğer fiziksel altyapıların kullanılarak her türlü elektronik verinin işlenmesi ve yönetilmesi alanıdır. Türkçede BT olarak da bilinir)",
  "NCC": "Network Coordination Centre (Ağ Koordinasyon Merkezi. Bölgesel internet kayıt kuruluşlarının (RIR) kendi bölgelerindeki IP adres bloklarını, otonom sistem numaralarını (ASN) tahsis eden ve internetin teknik koordinasyonunu sağlayan idari merkezidir)",
  "iSCSI": "Internet Small Computer System Interface (Depolama cihazlarını standart internet kabloları/ağları üzerinden bilgisayara doğrudan bağlıymış gibi çalıştırma protokolü)",
  "SHA-256": "Secure Hash Algorithm 256-bit (Verinin değiştirilmediğini kanıtlamak için kullanılan, geriye döndürülemez 256 bitlik son derece güvenli bir şifreleme algoritmasıdır)",
  "SHA-1": "Secure Hash Algorithm 1 (Eski ve güvenlik zayıflıkları nedeniyle artık pek tercih edilmeyen bir karma şifreleme algoritmasıdır)",
  "SAN": "Storage Area Network (Depolama Alanı Ağı. Şirketlerdeki devasa depolama ünitelerini ve sunucuları yüksek hızla birbirine bağlayan özel ve bağımsız ağ yapısıdır)",
  "WAF": "Web Application Firewall (Web Uygulaması Güvenlik Duvarı. Web sitelerine gelen zararlı istekleri filtreleyen, siteleri hacker saldırılarından koruyan özel kalkandır)",
  "SIEM": "Security Information and Event Management (Güvenlik Bilgileri ve Olay Yönetimi. Tüm sistem loglarını tek bir yerde toplayıp yapay zekayla siber saldırıları tespit eden alarm sistemidir)",
  "KVKK": "Kişisel Verilerin Korunması Kanunu (Kişisel verilerin işlenmesini disiplin altına alan, kişilerin temel hak ve özgürlüklerini koruyan Türk kanunudur)",
  "MASAK": "Mali Suçları Araştırma Kurulu (Türkiye'de kara para aklamayı ve terörün finansmanını önlemek amacıyla çalışan T.C. Hazine ve Maliye Bakanlığı'na bağlı resmi kuruluştur)",
  "SHA": "Secure Hash Algorithm (Güvenli Karma Algoritması. Verilerin bütünlüğünü ve şifrelerin güvenliğini doğrulamak için kullanılan algoritma ailesidir)",
  "MD5": "Message-Digest Algorithm 5 (Veri bütünlüğünü doğrulamada kullanılan eski bir karma şifreleme fonksiyonu. Güvenlik açıkları nedeniyle artık kritik işlerde kullanılmaz)",
  "MD4": "Message-Digest Algorithm 4 (MD5'ten de eski, günümüzde tamamen güvensiz kabul edilen bir şifreleme fonksiyonu)",
  "MD6": "Message-Digest Algorithm 6 (Daha güvenli ve modern bir şifreleme fonksiyonu olmasına rağmen SHA ailesi kadar yaygınlaşmamıştır)",
  "VPN": "Virtual Private Network (Sanal Özel Ağ. İnternet üzerinde şifreli ve güvenli bir tünel açarak, uzaktaki bir ağa veya internete gizlice ve güvenle bağlanmayı sağlar)",
  "MFA": "Multi-Factor Authentication (Çok Faktörlü Kimlik Doğrulama. Şifrenin yanına SMS kodu, parmak izi gibi ek bir güvenlik adımı daha ekleyerek hesabı koruma yöntemidir)",
  "IDS": "Intrusion Detection System (Saldırı Tespit Sistemi. Ağdaki şüpheli hareketleri ve siber saldırı girişimlerini izleyip sadece yöneticiye uyarı veren pasif alarm sistemidir)",
  "IPS": "Intrusion Prevention System (Saldırı Önleme Sistemi. Ağdaki saldırıları anında tespit edip siber saldırıyı otomatik olarak engelleyen/kesen aktif savunma sistemidir)",
  "PKI": "Public Key Infrastructure (Açık Anahtar Altyapısı. Sayısal sertifikalar ve anahtarlar kullanarak internet ortamında kimlik doğrulaması ve şifreleme sağlayan sistem bütünüdür)",
  "DLP": "Data Loss Prevention (Veri Sızıntısı Önleme. Şirket içindeki gizli bilgilerin (kredi kartı, müşteri verisi vb.) dışarıya e-posta veya USB ile sızmasını engelleyen yazılımdır)",
  "DMZ": "Demilitarized Zone (Arındırılmış Bölge. Dış dünyaya açık web sunucularını, şirketin iç güvenli ağından izole ederek konumlandırdığımız tampon koruma bölgesidir)",
  "OWASP": "Open Web Application Security Project (Açık Web Güvenliği Projesi. Web uygulamalarındaki en tehlikeli siber güvenlik açıklarını listeleyen ve güvenli kod yazmayı öğreten küresel topluluktur)",
  "XSS": "Cross-Site Scripting (Siteler Arası Betik Çalıştırma. Hacker'ların güvenli bir web sitesine zararlı JavaScript kodları ekleyerek diğer kullanıcıları hacklemesi zafiyetidir)",
  "CSRF": "Cross-Site Request Forgery (Siteler Arası İstek Sahteciliği. Kullanıcının tarayıcısındaki aktif oturumu kullanarak, kullanıcının bilgisi dışında bankadan para yollama gibi işlemler yaptırılması saldırısıdır)",
  "SQLi": "SQL Injection (Veritabanı Enjeksiyonu. Web sitesindeki form alanlarına zararlı SQL kodları yazarak veritabanındaki tüm gizli bilgilere yetkisiz erişme açığıdır)",
  "DoS": "Denial of Service (Hizmet Engelleme Saldırısı. Tek bir bilgisayardan bir sunucuya aşırı yüklenerek web sitesini veya sistemi erişilemez hale getirme girişimidir)",
  "DDoS": "Distributed Denial of Service (Dağıtık Hizmet Engelleme. Binlerce virüslü bilgisayar (botnet) aracılığıyla bir sunucuya aynı anda saldırıp sistemi çökertme yöntemidir)",
  "RTO": "Recovery Time Objective (Kurtarma Süresi Hedefi. Bir sistem çöktükten sonra, işlerin aksamaması için sistemin en geç ne kadar sürede (örn: 2 saat içinde) ayağa kalkması gerektiğidir)",
  "RPO": "Recovery Point Objective (Kurtarma Noktası Hedefi. Bir felaket anında şirketin en fazla ne kadar sürelik veri kaybını (örn: son 1 saatlik veri) göze alabileceğidir)",
  "COBIT": "Control Objectives for Information and Related Technologies (IT (Bilgi Teknolojileri) yönetimi ve denetimi için dünyaca kabul görmüş en popüler standart rehberdir)",
  "ISO": "International Organization for Standardization (Uluslararası Standartlar Teşkilatı. Bilgi güvenliği için en meşhur standardı ISO 27001'dir)",
  "ITIL": "Information Technology Infrastructure Library (IT Hizmet Yönetimi. Bilgi teknolojileri hizmetlerinin en kaliteli ve verimli şekilde sunulması için hazırlanan en popüler en iyi uygulamalar kütüphanesidir)",
  "NIST": "National Institute of Standards and Technology (ABD Ulusal Standartlar Enstitüsü. Özellikle siber güvenlik çerçevesi (NIST CSF) ile siber tehditleri önleme standartlarını belirler)",
  "BYOD": "Bring Your Own Device (Kendi Cihazını Getir. Çalışanların şirkete kendi kişisel telefon veya bilgisayarlarını getirip şirket işlerinde kullanması modelidir)",
  "CYOD": "Choose Your Own Device (Kendi Cihazını Seç. Şirketin belirlediği onaylı cihaz listesinden çalışanın kendi tercih ettiği cihazı seçip iş için kullanması modelidir)",
  "COPE": "Corporate-Owned, Personally Enabled (Şirkete ait, ancak çalışanın kişisel kullanımına da izin verilmiş cihaz modeli)",
  "SSL": "Secure Sockets Layer (Tarayıcı ile web sitesi arasındaki tüm trafiği şifreleyerek kredi kartı ve şifrelerin hackerlar tarafından çalınmasını önleyen eski şifreleme standardı)",
  "TLS": "Transport Layer Security (SSL'in yerini alan, modern internet sitelerinin şifreli ve güvenli veri iletişimi kurmasını sağlayan en güncel protokoldür (HTTPS))",
  "AES": "Advanced Encryption Standard (Gelişmiş Şifreleme Standardı. Günümüzde tüm dünyada askeri düzeyde gizli verileri şifrelemek için kullanılan en yaygın simetrik şifreleme yöntemidir)",
  "DES": "Data Encryption Standard (1970'lerden kalma, günümüz bilgisayarları tarafından dakikalar içinde kırılabilen eski ve artık güvensiz kabul edilen şifreleme standardı)",
  "3DES": "Triple Data Encryption Standard (DES şifrelemesini ardı ardına 3 kez uygulayarak daha güvenli hale getirilmiş ancak günümüzde yerini AES'e bırakmış eski yöntem)",
  "WLAN": "Wireless Local Area Network (Kablosuz Yerel Alan Ağı. Evlerdeki ve ofislerdeki Wi-Fi ağlarının genel teknik adıdır)",
  "WEP": "Wired Equivalent Privacy (İlk kablosuz ağ şifreleme standardı. Çok ciddi açıklar barındırır ve saniyeler içinde kırılabilir, kesinlikle kullanılmamalıdır)",
  "WPA": "Wi-Fi Protected Access (WEP'in güvenlik açıklarını kapatmak için çıkarılmış kablosuz şifreleme standardı)",
  "WPA3": "Wi-Fi Protected Access 3 (Kablosuz ağlar için geliştirilmiş en modern, en güncel ve en güvenli kablosuz şifreleme standardıdır)",
  "SSID": "Service Set Identifier (Kablosuz Ağ Adı. Telefonunuzla Wi-Fi aradığınızda listede gördüğünüz kablosuz ağların ismidir)",
  "LDAP": "Lightweight Directory Access Protocol (Dizin Hizmetleri Protokolü. Şirketlerdeki kullanıcı adı ve şifrelerin tek bir merkezden yönetilip sorgulanmasını sağlayan protokoldür)",
  "MAC": "Media Access Control (Fiziksel Cihaz Adresi. Dünyadaki her ağ kartına, modeme veya bilgisayara fabrikada atanan eşsiz ve benzersiz fiziksel kimlik numarasıdır)",
  "CAN": "Controller Area Network (Denetleyici Alan Ağı. Özellikle otomobillerde ve endüstriyel cihazlarda, kablo kalabalığını önleyip mikrodenetleyicilerin birbiriyle konuşmasını sağlayan ağ standardı)",
  "BDDK": "Bankacılık Düzenleme ve Denetleme Kurumu (Türkiye'de bankacılık ve finans sektörünü düzenleyen ve denetleyen, finansal istikrarı korumakla görevli resmi otoritedir)",
  "BSBDL": "Bilgi Sistemleri Bağımsız Denetim Lisansı (Sermaye piyasasında bilgi sistemleri bağımsız denetimi yapacak unvana sahip kişilere SPL tarafından verilen resmi lisans türüdür)",
  "ISA": "International Standards on Auditing (Uluslararası Denetim Standartları. Finansal tabloların bağımsız denetim kalitesini ve güvenilirliğini küresel düzeyde artırmak amacıyla yayımlanan evrensel denetim kuralları bütünüdür)",
  "ISACA": "Information Systems Audit and Control Association (Bilgi Sistemleri Denetim ve Kontrol Birliği. Siber güvenlik, BT yönetişimi ve bilgi sistemleri denetimi alanında küresel standartları ve CISA gibi saygın sertifikaları belirleyen uluslararası mesleki kuruluştur)",
  "ISACF": "Information Systems Audit and Control Foundation (Bilgi Sistemleri Denetim ve Kontrol Vakfı. Bilgi teknolojileri yönetişimi ve denetimi alanında araştırmaları destekleyen, standartların geliştirilmesine katkı sağlayan ISACA bünyesindeki vakıftır)",
  "LACNIC": "Latin America and Caribbean Network Information Centre (Latin Amerika ve Karayip bölgesi için internet IP numaralandırma kaynaklarını yöneten bölgesel internet kayıt kuruluşudur (RIR))",
  "RIPE": "Réseaux IP Européens Network Coordination Centre (Avrupa, Orta Doğu ve Orta Asya bölgeleri için internet IP kaynaklarını yöneten bölgesel internet kayıt kuruluşudur (RIR))",
  "CISA": "Certified Information Systems Auditor (Sertifikalı Bilgi Sistemleri Denetçisi. Uluslararası düzeyde geçerliliği olan, bilgi sistemleri denetçiliği uzmanlık unvanıdır)",
  "DAC": "Discretionary Access Control (İsteğe Bağlı Erişim Kontrolü. Dosya sahibinin, diğer kullanıcılara kendi isteğine göre okuma, yazma, silme yetkisi verebildiği erişim modeli)",
  "DDO": "T.C. Cumhurbaşkanlığı Dijital Dönüşüm Ofisi (Devletin dijitalleşme sürecini, siber güvenlik politikalarını ve e-Devlet kapısını yöneten resmi kurumdur)",
  "ECC": "Elliptic Curve Cryptography (Eliptik Eğri Kriptografisi. Çok daha küçük anahtar boyutlarıyla RSA gibi devasa anahtarlarla aynı düzeyde yüksek güvenlik sunan modern şifreleme yöntemi)",
  "FDDI": "Fiber Distributed Data Interface (Fiber Dağıtılmış Veri Arayüzü. Fiber optik kablolar üzerinden yüksek hızlı yerel ağ iletişimi sağlayan eski bir ağ teknolojisi)",
  "IAB": "Internet Architecture Board (İnternet Mimari Kurulu. İnternetin teknik gelişimini, standartlarını ve protokol yapısını denetleyen üst düzey kuruldur)",
  "ICANN": "Internet Corporation for Assigned Names and Numbers (İnternet Tahsisli Sayılar ve İsimler Kurumu. İnternetteki tüm web sitelerinin alan adlarını (.com, .net vb.) ve IP adreslerini yöneten küresel otoritedir)",
  "ICMP": "Internet Control Message Protocol (İnternet Kontrol Mesajı Protokolü. Ağdaki hata mesajlarını ileten ve cihazların birbirine ulaşıp ulaşmadığını test eden (ping) protokoldür)",
  "IEEE": "Institute of Electrical and Electronics Engineers (Elektrik ve Elektronik Mühendisleri Enstitüsü. Wi-Fi (802.11), Ethernet (802.3) gibi dünya çapındaki tüm teknolojik standartları belirleyen kuruluştur)",
  "IETF": "Internet Engineering Task Force (İnternet Mühendisliği Görev Gücü. İnternet protokollerinin (TCP/IP, HTTP vb.) tasarlanmasını ve geliştirilmesini sağlayan açık küresel topluluktur)",
  "IGMP": "Internet Group Management Protocol (İnternet Grup Yönetim Protokolü. Ağdaki yönlendiricilerin ve cihazların, tek bir yayını aynı anda birden çok kişiye (multicast) iletmesini yöneten protokoldür)",
  "ITAF": "Information Technology Assurance Framework (Bilgi Teknolojileri Güvence Çerçevesi. Bilgi sistemleri denetimi yaparken uyulması gereken standartlar ve uygulama esasları rehberidir)",
  "ITGI": "IT Governance Institute (IT Yönetişim Enstitüsü. Bilgi teknolojilerinin şirket hedefleriyle uyumlu ve güvenli şekilde yönetilmesi için araştırmalar yapan kuruluştur)",
  "ITU": "International Telecommunication Union (Uluslararası Telekomünikasyon Birliği. Telekomünikasyon ve radyo frekans standartlarını belirleyen Birleşmiş Milletler'e bağlı resmi kuruluştur)",
  "KGK": "Kamu Gözetimi, Muhasebe ve Denetim Standartları Kurumu (Türkiye'de bağımsız denetim standartlarını belirleyen, denetçileri yetkilendiren resmi düzenleyici kurumdur)",
  "LAN": "Local Area Network (Yerel Alan Ağı. Ev, okul veya ofis gibi sınırlı bir alandaki bilgisayarları birbirine bağlayan yerel ağ yapısıdır)",
  "LSO": "Local Security Officer (Yerel Güvenlik Sorumlusu. Belirli bir bölge, bina veya şubedeki bilgi güvenliği önlemlerinin uygulanmasından sorumlu olan yetkilidir)",
  "MAN": "Metropolitan Area Network (Metropol Alan Ağı. Bir şehir genelindeki birden çok binayı veya yerel ağı birbirine bağlayan geniş şehir ağıdır)",
  "NOS": "Network Operating System (Ağ İşletim Sistemi. Ağ üzerindeki sunucuları, veri paylaşımını ve kullanıcı yetkilerini yönetmek için tasarlanmış özel işletim sistemleridir)",
  "NTP": "Network Time Protocol (Ağ Zaman Protokolü. Ağdaki tüm bilgisayar ve sunucuların saatlerini, ortak bir zaman sunucusuyla saniyeden daha hassas şekilde eşitleyen protokoldür)",
  "OSI": "Open Systems Interconnection (Ağ iletişiminin nasıl gerçekleştiğini açıklayan, 7 katmandan (Fiziksel, Uygulama vb.) oluşan dünyaca kabul görmüş referans modeldir)",
  "PAN": "Personal Area Network (Kişisel Alan Ağı. Telefon, kulaklık gibi kişisel cihazların bluetooth yardımıyla birbirine bağlandığı çok dar alanlı ağdır)",
  "PDU": "Protocol Data Unit (Protokol Veri Birimi. Ağ katmanlarında taşınan verinin her bir aşamadaki teknik adıdır (örn: Paket, Segment, Frame))",
  "PIN": "Personal Identification Number (Kişisel Kimlik Numarası. ATM kartları veya telefonlar için kullanılan gizli güvenlik şifresidir)",
  "RA": "Registration Authority (Kayıt Makamı. PKI (Açık Anahtar) yapısında, kullanıcının kimliğini doğrulayıp Sertifika Makamına (CA) bildiren ara birimdir)",
  "SLA": "Service Level Agreement (Hizmet Seviyesi Anlaşması. Hizmet kalitesini, arıza durumunda en geç çözüm sürelerini yasal olarak garanti altına alan sözleşmedir)",
  "SNA": "Systems Network Architecture (IBM firması tarafından sunucular ve terminaller arasında iletişim kurmak için geliştirilmiş eski bir ağ mimarisi standardı)",
  "SNIA": "Storage Networking Industry Association (Depolama ağları ve veri depolama teknolojileri standartlarını geliştiren küresel üreticiler birliğidir)",
  "SPL": "Sermaye Piyasası Lisanslama Sicil ve Eğitim Kuruluşu (Sermaye piyasasında çalışan profesyonellerin lisanslama sınavlarını yapan ve sicillerini tutan resmi kuruluştur)",
  "SSO": "Single Sign-On (Tekli Oturum Açma. Tek bir kullanıcı adı ve şifreyle sisteme girip, şirketteki diğer tüm yetkili uygulamalara şifre sormadan otomatik bağlanabilme kolaylığıdır)",
  "SoD": "Segregation of Duties (Görevler Ayrılığı İlkesi. Bir iş sürecinde hata veya dolandırıcılığı önlemek amacıyla, yetki, onay ve kayıt işlemlerinin farklı kişilere dağıtılması kuralıdır)",
  "TCP": "Transmission Control Protocol (Geçiş Kontrol Protokolü. Ağ üzerinden gönderilen verilerin kayıpsız, eksiksiz ve doğru sırayla karşı tarafa ulaşmasını garanti eden güvenilir iletişim protokolüdür)",
  "TLD": "Top-Level Domain (Üst Düzey Alan Adı. İnternet adreslerinin sonundaki .com, .org, .net, .gov gibi en üst kategori uzantılardır)",
  "TOR": "The Onion Router (Soğan Yönlendirici. İnternet trafiğini dünya genelindeki binlerce gönüllü sunucu üzerinden şifreli aktararak kullanıcının kimliğini ve konumunu tamamen gizleyen anonim ağdır)",
  "TSE": "Türk Standartları Enstitüsü (Türkiye'de her türlü madde, mamul ve hizmet standardını hazırlayan ve belgelendiren resmi ulusal kuruluştur)",
  "TSPB": "Türkiye Sermaye Piyasaları Birliği (Sermaye piyasasında faaliyet gösteren tüm aracı kurum ve bankaların üye olmak zorunda olduğu mesleki kuruluştur)",
  "TTK": "Türk Ticaret Kanunu (Şirketlerin kuruluşu, yönetimi, ortaklıkları ve ticari defterlerine ilişkin yasal kuralları belirleyen ana kanundur)",
  "UDP": "User Datagram Protocol (Kullanıcı Veri Paketi Protokolü. TCP gibi kayıp kontrolü yapmayan, veriyi olabildiğince hızlı gönderen bağlantısız protokoldür. Canlı yayınlarda ve oyunlarda kullanılır)",
  "UPS": "Uninterruptible Power Supply (Kesintisiz Güç Kaynağı. Elektrik kesildiğinde içindeki batarya sayesinde bilgisayarların kapanmasını önleyip elektrik sağlamaya devam eden cihazdır)",
  "VoIP": "Voice over IP (IP Üzerinden Ses. Telefon görüşmelerinin klasik telefon hatları yerine internet ve IP protokolleri üzerinden dijital olarak gerçekleştirilmesidir)",
  "ZT": "Zero Trust (Sıfır Güven Mimarisi. Ağın içindeki veya dışındaki hiç kimseye varsayılan olarak güvenmeyip, her işlemde sürekli kimlik doğrulama ve en az yetki kuralı isteyen modern güvenlik felsefesidir)",
  "ZTA": "Zero Trust Architecture (Sıfır Güven Mimarisi. Zero Trust felsefesine uygun olarak tasarlanmış olan güvenli siber altyapı ve ağ tasarımıdır)",
  "WAN": "Wide Area Network (Geniş Alan Ağı. Şehirlerarası veya ülkelerarası gibi çok geniş coğrafi bölgelerdeki bilgisayarları ve yerel ağları birbirine bağlayan devasa ağ yapısıdır (örn: İnternet))",
  "AFRINIC": "African Network Information Centre (Afrika kıtası için internet IP numaralandırma kaynaklarını yöneten bölgesel internet kayıt kuruluşudur (RIR))",
  "ANSI": "American National Standards Institute (Amerikan Ulusal Standartlar Enstitüsü. ABD'de endüstriyel ve teknolojik standartları belirleyen resmi kuruluştur)",
  "APNIC": "Asia-Pacific Network Information Centre (Asya-Pasifik bölgesi için internet IP numaralandırma kaynaklarını yöneten bölgesel internet kayıt kuruluşudur (RIR))",
  "ARIN": "American Registry for Internet Numbers (Kuzey Amerika bölgesi için internet IP numaralandırma kaynaklarını yöneten bölgesel internet kayıt kuruluşudur (RIR))",
  "ARPANET": "Advanced Research Projects Agency Network (Modern internetin temeli kabul edilen, 1969 yılında ABD Savunma Bakanlığı bünyesinde kurulan ilk paket anahtarlamalı ağdır)",
  "ATM": "Asynchronous Transfer Mode (Eşzamansız Aktarım Modu. Ses, veri ve görüntüyü sabit boyutlu hücreler halinde yüksek hızla taşıyan eski bir ağ anahtarlama teknolojisidir)",
  "APT": "Advanced Persistent Threat (Gelişmiş Kalıcı Tehdit. Devlet destekli veya son derece organize siber korsan grupları tarafından, hedef sisteme gizlice sızıp aylarca/yıllarca veri çalan uzun süreli siber saldırılardır)",

  "BSBD": "Bilgi Sistemleri Bağımsız Denetimi (Kurumların bilgi sistemleri altyapılarını, güvenlik kontrollerini ve süreçlerini yasal mevzuatlara ve standartlara uygunluk açısından bağımsız uzmanlarca denetleme sürecidir)",
  "BSSID": "Basic Service Set Identifier (Kablosuz ağ erişim noktasının (modem/router) fiziksel MAC adresidir. Wi-Fi bağlantılarında cihazların modemi tam olarak tanımasını sağlar)",
  "BSY": "Bilgi Sistemleri Yönetimi (Bir kurumun bilgi teknolojisi kaynaklarının, altyapısının, insan gücünün ve stratejilerinin şirket hedefleriyle uyumlu şekilde yönetilmesi sürecidir)",
  "BT": "Bilgi Teknolojileri (Bilgisayar, depolama, ağ ve diğer fiziksel cihazların, her türlü elektronik veriyi oluşturmak, işlemek, depolama ve iletmek için kullanılması disiplinidir)",
  "CA": "Certification Authority (Sertifika Otoritesi. Dijital sertifikaları (SSL/TLS) üreten, imzalayan, dağıtan ve bunların güvenilirliğini garanti eden PKI yapısındaki resmi kurumdur)",
  "CER": "Crossover Error Rate (Çapraz Hata Oranı. Biyometrik güvenlik sistemlerinde Yanlış Kabul Oranı (FAR) ile Yanlış Reddetme Oranının (FRR) eşitlendiği, cihazın genel hassasiyetini gösteren denge noktasıdır)",
  "COBO": "Corporate-Owned, Business-Only (Şirkete ait, sadece iş amaçlı kullanılabilir mobil cihaz modeli. Kişisel uygulamaların yüklenmesi yasaktır)",
  "CRL": "Certificate Revocation List (Sertifika İptal Listesi. Süresi dolmadan çalınan, sızdırılan veya geçersiz kılınan dijital sertifikaların tutulduğu resmi kara listedir)",
  "DARPA": "Defense Advanced Research Projects Agency (ABD Savunma Bakanlığı bünyesinde, internet dahil ileri teknoloji askeri araştırma ve geliştirme projeleri yürüten dairedir)",
  "DCE": "Data Circuit-Terminating Equipment (Veri Devresi Sonlandırıcı Cihaz. Ağ iletişiminde veriyi ileten cihaz (DTE) ile fiziksel iletim hattı arasında bağlantı kuran modem gibi ara birim cihazlarıdır)"
}

export function extractDynamicAbbreviations(sections: any[]): Record<string, string> {
  const dynamicDict: Record<string, string> = {}
  if (!sections || !Array.isArray(sections)) return dynamicDict

  for (const section of sections) {
    if (!section.notes) continue

    const notes = section.notes
    const lines = notes.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith("### 🔑")) {
        const rawTerm = line.replace("### 🔑", "").trim()
        const cleanTerm = rawTerm.split("(")[0].trim().replace(/[^a-zA-Z0-9-İıŞşÇçĞğÜüÖö]/g, "")
        
        if (cleanTerm && cleanTerm.length > 1) {
          let definition = ""
          for (let j = 1; j <= 5 && i + j < lines.length; j++) {
            const nextLine = lines[i + j].trim()
            if (nextLine.startsWith("- **Açılımı") || nextLine.startsWith("- **Açılımı veya Resmi Tanımı")) {
              definition = nextLine.replace(/- \*\*Açılımı( veya Resmi Tanımı)?:\*\*/i, "").trim()
              definition = definition.replace(/^\s*\*\*\s*/, "").replace(/\s*\*\*\s*$/, "")
              break
            }
          }
          if (cleanTerm && definition) {
            dynamicDict[cleanTerm] = definition
          }
        }
      }
    }
  }
  return dynamicDict
}

export function renderTextWithTooltips(children: React.ReactNode, dict: Record<string, string> = ABBREVIATIONS_DICT): React.ReactNode {
  if (typeof children !== "string") {
    if (Array.isArray(children)) {
      return children.map((child, idx) => (
        <span key={idx}>{renderTextWithTooltips(child, dict)}</span>
      ))
    }
    return children
  }

  const text = children
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length)
  if (keys.length === 0) return text
  
  const regex = new RegExp(`\\b(${keys.join("|")})\\b`, 'g')

  const parts = text.split(regex)
  if (parts.length <= 1) return text

  return parts.map((part, index) => {
    if (index % 2 === 1) {
      const desc = dict[part] || dict[part.toUpperCase()] || ""
      return (
        <Tooltip key={index} content={desc}>
          <span className="text-amber-400 font-bold border-b border-dotted border-amber-400 cursor-help select-none hover:text-amber-300 transition-colors">
            {part}
          </span>
        </Tooltip>
      )
    }
    return part
  })
}

export default function NotesTab({ course, slug, isAdmin, onReloadCourse, initialSectionId, initialScrollKeyword, processingStatus }: { course: any; slug: string; isAdmin?: boolean; onReloadCourse?: () => void; initialSectionId?: string; initialScrollKeyword?: string; processingStatus?: any }) {
  const [sections, setSections] = useState<any[]>(course.sections || [])

  const dynamicDict = useMemo(() => {
    return extractDynamicAbbreviations(sections)
  }, [sections])

  const mergedDict = useMemo(() => {
    return { ...ABBREVIATIONS_DICT, ...dynamicDict }
  }, [dynamicDict])

  const renderTooltips = useCallback((children: React.ReactNode): React.ReactNode => {
    return renderTextWithTooltips(children, mergedDict)
  }, [mergedDict])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [currentBookmark, setCurrentBookmark] = useState<{ sectionId: string } | null>(null)
  const [highlightPopup, setHighlightPopup] = useState<{ x: number; y: number; text: string; sectionId: string; sectionTitle: string } | null>(null)
  const [highlightNote, setHighlightNote] = useState("")
  const [scrollKeyword, setScrollKeyword] = useState<string>(initialScrollKeyword || "")
  const [sectionHighlights, setSectionHighlights] = useState<Record<string, Highlight[]>>({})
  const [courseHighlights, setCourseHighlights] = useState<Highlight[]>([])
  const [showHighlightsMenu, setShowHighlightsMenu] = useState(false)
  const [activeScoreSection, setActiveScoreSection] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (course?.sections) {
      setSections(course.sections)
    }
  }, [course?.sections])

  // Günün kavramından tıklandığında ilgili konuyu aç ve oraya kaydır
  useEffect(() => {
    if (initialSectionId) {
      setExpandedIds(new Set([initialSectionId]))
      if (initialScrollKeyword) setScrollKeyword(initialScrollKeyword);
      setTimeout(() => {
        const el = document.getElementById(`section-card-${initialSectionId}`)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 300)
    }
  }, [initialSectionId, initialScrollKeyword])

  // Bookmark yükle
  useEffect(() => {
    const bm = getBookmarkForCourse(slug)
    if (bm) setCurrentBookmark({ sectionId: bm.sectionId })
  }, [slug])

  // Kursun tüm highlight'larını yükle
  useEffect(() => {
    setCourseHighlights(getHighlightsForCourse(slug))
  }, [slug, sectionHighlights])

  // Highlight popup — metin seçildiğinde göster
  const handleTextSelect = useCallback((sectionId: string, sectionTitle: string) => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      return
    }
    const text = selection.toString().trim()
    if (text.length < 3) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setHighlightPopup({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      text,
      sectionId,
      sectionTitle
    })
  }, [])

  const doHighlight = useCallback((color: Highlight["color"]) => {
    if (!highlightPopup) return
    const hl = addHighlight({
      sectionId: highlightPopup.sectionId,
      sectionTitle: highlightPopup.sectionTitle,
      courseSlug: slug,
      selectedText: highlightPopup.text,
      color,
      note: highlightNote.trim() || undefined
    })
    setSectionHighlights(prev => ({
      ...prev,
      [highlightPopup.sectionId]: [...(prev[highlightPopup.sectionId] || []), hl]
    }))
    setHighlightPopup(null)
    setHighlightNote("")
    window.getSelection()?.removeAllRanges()
    toast.success(`"${hl.selectedText.substring(0, 30)}..." işaretlendi! 🖍️`)
  }, [highlightPopup, slug])

  // Highlights yükle (section expand olduğunda)
  const loadHighlights = useCallback((sectionId: string) => {
    const hls = getHighlightsForSection(sectionId)
    setSectionHighlights(prev => ({ ...prev, [sectionId]: hls }))
  }, [])

  // Popup kapat (dışarı tıklayınca)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (highlightPopup && !(e.target as HTMLElement)?.closest?.('.highlight-popup')) {
        setHighlightPopup(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [highlightPopup])

  async function exportAllNotesAsPdf() {
    setExporting(true)
    try {
      const noteSections = sections
        .filter((s: any) => s.notes && s.notes.length > 50)
        .sort((a: any, b: any) => a.pageStart - b.pageStart)

      if (noteSections.length === 0) {
        toast.error("Henüz ders notu yok!")
        setExporting(false)
        return
      }

      // Markdown'u güzel HTML'e çevirme fonksiyonu
      function md2html(text: string): string {
        // 0. Yeni satırları (\r\n -> \n) normalize et. Bu sayede tablolar ve listeler asla bozulmaz.
        const normalizedText = (text || '').replace(/\r\n/g, '\n');

        // Şemalardaki uzun kutu metinlerini otomatik bölen yardımcı fonksiyon (Mermaid'in devasa kutu çizmesini engeller)
        function wrapLongText(str: string, maxLineLength = 15): string {
          if (str.includes('<br>') || str.includes('<br/>') || str.toLowerCase().includes('<br')) return str;
          if (str.length <= maxLineLength) return str;
          
          // Boşluk yoksa karakter bazlı zorla böl (Türkçe uzun terimler için fallback)
          if (!str.includes(' ')) {
            const chunks: string[] = [];
            for (let i = 0; i < str.length; i += maxLineLength) {
              chunks.push(str.substring(i, i + maxLineLength));
            }
            return chunks.join('<br>');
          }
          
          const words = str.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          words.forEach(word => {
            // Tek kelime bile maxLineLength'ten uzunsa onu da böl
            if (word.length > maxLineLength) {
              if (currentLine) { lines.push(currentLine); currentLine = ''; }
              for (let i = 0; i < word.length; i += maxLineLength) {
                lines.push(word.substring(i, i + maxLineLength));
              }
              return;
            }
            if ((currentLine + ' ' + word).trim().length <= maxLineLength) {
              currentLine = (currentLine + ' ' + word).trim();
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) lines.push(currentLine);
          
          return lines.join('<br>');
        }

        // 1. Mermaid bloklarını korumaya al (Böylece cleanMarkdown veya \n -> <br/> değişimlerinden etkilenmez)
        const mermaidBlocks: string[] = [];
        let tempText = normalizedText.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
          // Kutulardaki ([], {}, ()) uzun metinleri otomatik <br> ile bölerek şemayı son derece dengeli ve kompakt yapıyoruz
          const processedCode = code.replace(/([a-zA-Z0-9_-]+)({\s*"([^"]+)"\s*}|{\s*([^{}]+)\s*}|\[\s*"([^"]+)"\s*\]|\[\s*([^\[\]]+)\s*\]|\(\s*"([^"]+)"\s*\)|\(\s*([^\(\)]+)\s*\))/g, (m: string, id: string, shapes: string, g1: string | undefined, g2: string | undefined, g3: string | undefined, g4: string | undefined, g5: string | undefined, g6: string | undefined) => {
            const rawText = g1 || g2 || g3 || g4 || g5 || g6 || '';
            const wrappedText = wrapLongText(rawText.trim(), 15);
            if (shapes.startsWith('{')) return `${id}{"${wrappedText}"}`;
            if (shapes.startsWith('[')) return `${id}["${wrappedText}"]`;
            if (shapes.startsWith('(')) return `${id}("${wrappedText}")`;
            return m;
          });
          
          mermaidBlocks.push(processedCode);
          return `%%DIAGRAM_BLOCK_${mermaidBlocks.length - 1}%%`;
        });

        // Teknik kelimeleri temizle (Mermaid, Mermaid.js vb. kullanıcı görmesin)
        tempText = tempText
          .replace(/mermaid\.js/gi, 'görsel akış şeması')
          .replace(/mermaid diyagramı/gi, 'akış şeması')
          .replace(/mermaid/gi, 'akış şeması')

        // 2. Kalan metni temizle ve HTML'e çevir
        let html = cleanMarkdown(tempText, true)
          // Normal Kod blokları
          .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="print-code" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:11px;overflow-x:auto;margin:10px 0;page-break-inside:avoid;break-inside:avoid;"><code>$2</code></pre>')
          // Tablolar
          .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g, (match: string) => {
            const rows = match.trim().split('\n').filter((r: string) => !r.match(/^\|[-| :]+\|$/))
            const header = rows[0]
            const body = rows.slice(1)
            const thCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => 
              `<th style="padding:6px 10px;background:#1e3a5f;color:white;font-size:11px;font-weight:700;text-align:left;border:1px solid #cbd5e1;">${c.trim()}</th>`
            ).join('')
            const bodyRows = body.map((r: string, ri: number) => {
              const cells = r.split('|').filter((c: string) => c.trim()).map((c: string) =>
                `<td style="padding:5px 10px;font-size:11px;border:1px solid #e2e8f0;background:${ri % 2 === 0 ? '#ffffff' : '#f8fafc'};">${c.trim()}</td>`
              ).join('')
              return `<tr>${cells}</tr>`
            }).join('')
            return `<table class="print-table" style="width:100%;border-collapse:collapse;margin:12px 0;border-radius:8px;overflow:hidden;page-break-inside:avoid;break-inside:avoid;"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
          })
          // BAŞLIKLARI BÖLÜNMEZ BÖLÜM DIV'LERİ İLE SARMA (ORPHAN/WIDOW VE KOPUKLUK ENGELLEME)
          // Her ### ve ## başlığı gördüğümüzde önceki sarmalayıcıyı kapatıp yeni bir bölünmez div açıyoruz.
          .replace(/^### (.+)/gm, '</div><div class="print-section-block" style="page-break-inside: auto; break-inside: auto; margin-bottom: 16px;"><h3 style="font-size:15px;color:#1e3a5f;margin:18px 0 8px;font-weight:700;page-break-after:avoid;break-after:avoid;display:block;"><svg style="display:inline-block;vertical-align:middle;margin-right:6px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg><span style="vertical-align:middle;">$1</span></h3>')
          .replace(/^## (.+)/gm, '</div><div class="print-section-block" style="page-break-inside: auto; break-inside: auto; margin-bottom: 24px;"><h2 style="font-size:17px;color:#0f172a;margin:22px 0 10px;font-weight:800;border-bottom:2px solid #e2e8f0;padding-bottom:6px;page-break-after:avoid;break-after:avoid;display:block;"><svg style="display:inline-block;vertical-align:middle;margin-right:6px;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg><span style="vertical-align:middle;">$1</span></h2>')
          .replace(/^# (.+)/gm, '</div><div class="print-section-block" style="page-break-inside: auto; break-inside: auto; margin-bottom: 28px;"><h1 style="font-size:20px;color:#0f172a;margin:28px 0 12px;font-weight:800;page-break-after:avoid;break-after:avoid;display:block;">$1</h1>')
          .replace(/^#### (.+)/gm, '<h4 style="font-size:14px;color:#1e3a5f;margin:16px 0 6px;font-weight:700;page-break-after:avoid;break-after:avoid;display:block;">$1</h4>')
          // Yatay Çizgiler (---)
          .replace(/^---\s*$/gm, '<hr class="print-hr" style="border:0;border-top:1px solid #cbd5e1;margin:16px 0;page-break-inside:avoid;break-inside:avoid;"/>')
          // İnline stiller
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0f172a;">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:12px;color:#be185d;">$1</code>')
          // Emoji rozet satırları
          .replace(/^((?:🔴|🟡|🟢|📌|⚡|🔑|💡|📊|⚠️|✅|❌|📝|🎯|📋).+)$/gm, '<div class="callout-block" style="background:#eff6ff;border-left:3px solid #3b82f6;padding:8px 12px;margin:8px 0;border-radius:0 6px 6px 0;font-size:13px;font-weight:600;color:#1e40af;page-break-inside:avoid;break-inside:avoid;">$1</div>')
          // Listeler
          .replace(/^(\d+)\.\s(.+)/gm, '<div style="display:flex;gap:8px;margin:4px 0 4px 12px;page-break-inside:avoid;break-inside:avoid;"><span style="color:#3b82f6;font-weight:700;min-width:20px;">$1.</span><span>$2</span></div>')
          .replace(/^[-•*]\s(.+)/gm, '<div style="display:flex;gap:6px;margin:3px 0 3px 16px;page-break-inside:avoid;break-inside:avoid;"><span style="color:#3b82f6;">▸</span><span style="flex:1;">$1</span></div>')
          // Paragraflar
          .replace(/\n\n/g, '<div style="height:10px;"></div>')
          .replace(/([^\n<>])\n([^\n<>])/g, '$1<br/>$2')

        // html'in en başına açılış div'ini koyuyoruz
        let wrappedHtml = '<div class="print-section-block" style="page-break-inside: auto; break-inside: auto; margin-bottom: 16px;">' + html + '</div>';

        // İlk baştaki gereksiz sarmalayıcıyı ve boş aç-kapa div'lerini temizle
        wrappedHtml = wrappedHtml
          .replace('<div class="print-section-block" style="page-break-inside: auto; break-inside: auto; margin-bottom: 16px;"></div>', '')
          .replace(/<div class="print-section-block"[^>]*><\/div>/g, '');


        // 3. Mermaid bloklarını geri yükle (Artık <br/> veya HTML karakterlerinden etkilenmeyecek)
        mermaidBlocks.forEach((code, index) => {
          wrappedHtml = wrappedHtml.replace(`%%DIAGRAM_BLOCK_${index}%%`, `<div class="mermaid-wrap" data-char-count="${code.length}">\n<div class="mermaid">\n${code}\n</div>\n</div>`);
        });

        // Başlıkların hemen ardındaki boşluk div'lerini temizle ki page-break-after: avoid kuralı kırılmasın
        wrappedHtml = wrappedHtml.replace(/(<\/h[1-4]>)\s*<div style="height:10px;"><\/div>/gi, '$1');

        return wrappedHtml;
      }

      // Notların HTML'ini hazırla
      const notesHtml = noteSections.map((s: any, i: number) => {
        const colors: Record<string, { border: string; bg: string; text: string; badge: string }> = {
          High: { border: '#ef4444', bg: '#fef2f2', text: '#991b1b', badge: 'YÜKSEK ÖNEMLİ' },
          Medium: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', badge: 'ORTA DÜZEY' },
          Low: { border: '#22c55e', bg: '#f0fdf4', text: '#166534', badge: 'EK BİLGİ' },
        }
        const c = colors[s.importance] || colors.Medium
        const noteContent = md2html(s.notes || '')

        return `
          <div class="section-block">
            <!-- Bölüm Başlığı -->
            <div style="background:linear-gradient(135deg, ${c.bg}, #ffffff);border-left:5px solid ${c.border};padding:16px 20px;border-radius:0 12px 12px 0;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.06);page-break-after:avoid;break-after:avoid;">
              <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px;">
                <span style="font-size:20px;font-weight:800;color:#0f172a;">${formatTitle(s.title, i, s.notes, s.module)}</span>
              </div>
              ${isAdmin ? `
              <div style="display:flex;gap:8px;font-size:11px;">
                <span style="background:#e2e8f0;color:#475569;padding:2px 10px;border-radius:20px;display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Sayfa ${s.pageStart}–${s.pageEnd}</span>
              </div>
              ` : ''}
            </div>
            <!-- İçerik -->
            <div style="font-size:13px;color:#1e293b;line-height:1.75;">
              <p style="margin:6px 0;">${noteContent}</p>
            </div>
          </div>`
      }).join('\n')

      // İçindekiler
      const tocHtml = noteSections.map((s: any, i: number) => {
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dotted #cbd5e1;">
          <span style="font-size:13px;color:#1e293b;"><strong style="color:#3b82f6;">${i + 1}.</strong> ${formatTitle(s.title, i, s.notes, s.module)}</span>
          ${isAdmin ? `<span style="font-size:11px;color:#94a3b8;white-space:nowrap;">Sayfa ${s.pageStart}–${s.pageEnd}</span>` : ''}
        </div>`
      }).join('')

      // Stats
      const totalChars = noteSections.reduce((sum: number, s: any) => sum + (s.notes?.length || 0), 0)
      const criticalCount = noteSections.filter((s: any) => s.importance === 'High').length
      const importantCount = noteSections.filter((s: any) => s.importance === 'Medium').length

      // Blob URL ile açarak about:blank sorununu çöz
      const fullHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${course.name} - Ders Notları</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    function initMermaid() {
      if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: true, theme: 'default' });
        
        // Mermaid kendi içinde DOM elemanlarını ölçerek en kusursuz "max-width" değerini inline style olarak atar.
        // Bizim yapmamız gereken tek şey aradan çekilip Mermaid'in bu doğal hesaplamasını bozmamaktır.
        
        // Markdown kod bloklarını mermaid div'lerine çevir
        document.querySelectorAll('code.language-mermaid').forEach(el => {
          const div = document.createElement('div');
          div.className = 'mermaid';
          div.textContent = el.textContent;
          el.parentNode.replaceWith(div);
        });

      } else {
        setTimeout(initMermaid, 50);
      }
    }
    
    // Doğrudan hemen çalıştır (Blob URL'ler ve anlık yüklenmeler için en güvenlisi)
    initMermaid();
    
    // Tarayıcı olayları için yedek tetikleyiciler
    document.addEventListener('DOMContentLoaded', initMermaid);
    window.addEventListener('load', initMermaid);
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      background: white;
    }

    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: white;
      color: #0f172a;
      page-break-after: always;
      min-height: 85vh;
      border: 8px solid #f8fafc;
      border-radius: 20px;
      margin: 10px;
    }
    .cover-badge { font-size:14px; letter-spacing:4px; color:#3b82f6; margin-bottom:24px; font-weight:700; text-transform: uppercase; }
    .cover h1 { font-size:42px; font-weight:900; margin-bottom:16px; line-height:1.2; color:#0f172a; max-width: 80%; }
    .cover .subtitle { font-size:16px; color:#64748b; margin-bottom:50px; }
    .cover .stats-row { display:flex; gap:20px; justify-content:center; margin-bottom:50px; }
    .cover .stat-box { padding:12px 24px; border:1.5px solid #e2e8f0; border-radius:12px; background:#f8fafc; }
    .cover .stat-num { font-size:22px; font-weight:800; color:#3b82f6; }
    .cover .stat-label { font-size:11px; color:#64748b; margin-top:2px; }
    .cover .date { font-size:11px; color:#94a3b8; margin-top:40px; }

    .toc { padding:40px 50px; page-break-after:always; }
    .toc h2 { font-size:22px; color:#0f172a; border-bottom:3px solid #3b82f6; padding-bottom:10px; margin-bottom:20px; font-weight:800; }

    .content { padding: 0; margin: 0; }
    .section-block { 
      padding: 10px 0; 
      margin: 0; 
      page-break-before: always; 
      page-break-inside: auto; 
      display: flow-root; 
    }
    .section-block:first-of-type {
      page-break-before: avoid !important;
    }

    /* Professional Orphan & Widow protection for headings, paragraphs, and list items */
    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid !important;
      break-after: avoid !important;
      break-after: avoid-page !important;
    }
    
    p, div, li, span, tr {
      orphans: 3 !important;
      widows: 3 !important;
    }

    .print-table {
      width: auto !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 15px auto !important;
      border-collapse: collapse !important;
    }
    .print-table td, .print-table th {
      word-break: break-word !important;
      overflow-wrap: break-word !important;
      max-width: 250px !important;
    }

    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }

    /* Elegant, ink-saving, beautifully scaled Mermaid diagrams in print & view */
    .mermaid-wrap {
      display: block !important;
      width: 100% !important;
      margin: 15px auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important; /* Modern standard */
      background: transparent !important;
    }
    /* Kutusuz/serbest kitap tasarımı: Çerçeve ve dolguları tamamen kaldırıyoruz */
    .mermaid-wrap .mermaid {
      display: block !important;
      width: 100% !important;
      margin: 0 auto !important;
      border: none !important;
      background: transparent !important;
      padding: 0 !important;
      border-radius: 0 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .mermaid-wrap svg {
      display: block !important;
      margin: 0 auto !important;
      /* Responsive ölçekleme: şema sayfadan taşmaz, otomatik küçülür */
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      /* viewBox korunduğu sürece SVG kendi kendini ölçekler */
      overflow: visible !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .mermaid-wrap svg rect,
    .mermaid-wrap svg polygon,
    .mermaid-wrap svg circle,
    .mermaid-wrap svg ellipse,
    .mermaid-wrap svg path.node {
      fill: #f8fafc !important;
      stroke: #1e3a5f !important;
      stroke-width: 1.5px !important;
    }
    .mermaid-wrap svg .label,
    .mermaid-wrap svg text,
    .mermaid-wrap svg span {
      fill: #0f172a !important;
      color: #0f172a !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
    }
    .mermaid-wrap svg .edgePath .path,
    .mermaid-wrap svg .edgePath path,
    .mermaid-wrap svg path.link,
    .mermaid-wrap svg path.connection {
      stroke: #475569 !important;
      stroke-width: 1.5px !important;
    }
    .mermaid-wrap svg .markerPath,
    .mermaid-wrap svg marker path,
    .mermaid-wrap svg .arrowheadPath {
      fill: #475569 !important;
      stroke: #475569 !important;
    }
    .mermaid-wrap svg .edgeLabel rect {
      fill: #ffffff !important;
      opacity: 0.95 !important;
    }
    .mermaid-wrap svg .edgeLabel text {
      fill: #334155 !important;
      font-size: 11px !important;
      font-weight: 600 !important;
    }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: white; border-top: none; }
      .no-print { display: none !important; }
      @page { size: A4; margin: 18mm 15mm 15mm 15mm; }
      @page :first { margin: 0; }
      .cover { min-height: 100vh; border: none; border-left: 12px solid #3b82f6; margin: 0; border-radius: 0; }
      .mermaid-wrap .mermaid { border: none !important; background: transparent !important; padding: 0 !important; }
      .content { padding: 0 !important; margin: 0 !important; }
      .section-block { 
        padding: 0 0 10px 0 !important; 
        margin: 0 !important; 
        display: flow-root !important; 
        page-break-before: always !important;
        page-break-inside: auto !important;
      }
      .section-block:first-of-type {
        page-break-before: avoid !important;
      }
    }

    .print-bar {
      position: fixed; top:0; left:0; right:0;
      background: linear-gradient(135deg, #1e3a5f, #1e40af);
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-bar span { color: white; font-size: 14px; font-weight: 600; }
    .print-btn {
      background: linear-gradient(to right, #3b82f6, #4f46e5); color: white; border: none;
      padding: 10px 28px; border-radius: 8px; font-size: 14px; font-weight: 700;
      cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    .print-btn:hover { transform: scale(1.02); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4); }
    body { padding-top: 56px; }
    @media print { body { padding-top: 0; } }
  </style>
</head>
<body>
  
  <div class="print-bar no-print">
    <span>${course.name} - Ders Notları</span>
    <button class="print-btn" onclick="window.print()">PDF Olarak Kaydet</button>
  </div>

  <div class="cover">
    <div class="cover-badge">DERS NOTLARI</div>
    <h1>${course.name}</h1>
    <p class="subtitle">${course.code || ''} · ${course.instructor || ''}</p>
  </div>

  <div class="toc">
    <h2>İÇİNDEKİLER</h2>
    ${tocHtml}
  </div>

  <div class="content">${notesHtml}</div>

  <div style="page-break-before:always;text-align:center;padding:80px 40px;">
    <div style="font-size:40px;margin-bottom:20px;"></div>
    <h2 style="font-size:24px;color:#0f172a;font-weight:800;">Başarılar!</h2>
    <div style="margin-top:40px;font-size:11px;color:#94a3b8;">Sınav Asistanım · ${new Date().getFullYear()}</div>
  </div>
</body>
</html>`

      const blob = new Blob([fullHtml], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Blob URL'yi temizle (pencere açıldıktan sonra)
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      toast.success("PDF penceresi açıldı! 'PDF Olarak Kaydet' butonuna tıkla.")
    } catch (err: any) {
      console.error('[PDF]', err)
      toast.error("PDF oluşturulurken hata: " + err.message)
    }
    setExporting(false)
  }

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="İçerik Hazırlanıyor"
        description="Bu dersin materyalleri yapay zeka asistanımız tarafından analiz ediliyor. Arka planda çalışma notlarınız ve sorularınız oluşturulurken lütfen daha sonra tekrar kontrol ediniz."
      />
    )
  }

  const noteSections = sections

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      loadHighlights(id)
    }
    setExpandedIds(next)
  }

  const handleBookmark = (e: React.MouseEvent, sectionId: string, sectionTitle: string) => {
    e.stopPropagation()
    if (currentBookmark?.sectionId === sectionId) {
      removeBookmark(slug)
      setCurrentBookmark(null)
      toast.success("Yer imi kaldırıldı")
    } else {
      setBookmark({ sectionId, sectionTitle, courseSlug: slug, scrollPosition: 0 })
      setCurrentBookmark({ sectionId })
      toast.success(`📌 "${sectionTitle.substring(0, 40)}" — burada kaldın!`)
    }
  }

  return (
    <section className="space-y-6" aria-label="Ders notları">
      {/* Header Stats + PDF Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{noteSections.length} bölüm ders notu</span>
          {currentBookmark && (
            <button
              onClick={() => {
                const el = document.getElementById(`section-card-${currentBookmark.sectionId}`);
                if (el) {
                  if (!expandedIds.has(currentBookmark.sectionId)) {
                    toggleExpand(currentBookmark.sectionId);
                  }
                  setTimeout(() => {
                    const scrollParent = el.closest('.overflow-y-auto') as HTMLElement;
                    if (scrollParent) {
                      const parentRect = scrollParent.getBoundingClientRect();
                      const elRect = el.getBoundingClientRect();
                      const relativeTop = elRect.top - parentRect.top;
                      scrollParent.scrollTo({ top: scrollParent.scrollTop + relativeTop - 20, behavior: 'smooth' });
                    } else {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 150);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-bold transition-all border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
              aria-label="Kaldığım Yere Git"
            >
              <Bookmark className="w-3.5 h-3.5 fill-current" />
              Kaldığım Yere Git
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Boyadığım Yerler Dropdown */}
          {courseHighlights.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowHighlightsMenu(!showHighlightsMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-xs font-bold transition-all border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
              >
                <Highlighter className="w-3.5 h-3.5 fill-current" />
                Boyadığım Yerler ({courseHighlights.length})
              </button>
              
              <AnimatePresence>
                {showHighlightsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-[#060912]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Palette className="w-4 h-4 text-yellow-400" /> Önemli Notlarım
                      </h4>
                      <button onClick={() => setShowHighlightsMenu(false)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-2 space-y-2">
                      {courseHighlights.map(hl => (
                        <button
                          key={hl.id}
                          onClick={() => {
                            setShowHighlightsMenu(false);
                            setScrollKeyword(hl.selectedText);
                            if (!expandedIds.has(hl.sectionId)) {
                              toggleExpand(hl.sectionId);
                            }
                          }}
                          className="w-full text-left p-3 rounded-xl hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.06] flex flex-col gap-1"
                        >
                          <span className="text-[10px] font-bold text-slate-500 line-clamp-1">{hl.sectionTitle}</span>
                          <span className={`text-xs leading-relaxed line-clamp-3 p-1.5 rounded-md ${getColorClass(hl.color)}`}>
                            {hl.selectedText}
                          </span>
                          {hl.note && (
                            <span className="text-[10px] text-slate-300 italic px-1">📝 {hl.note}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={exportAllNotesAsPdf}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50"
          aria-label="Tüm Notları PDF İndir"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              PDF Oluşturuluyor...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Tüm Notları PDF İndir
            </>
          )}
        </button>
      </div>
      </div>

      {/* Notes List */}
      {noteSections.map((section: any, i: number) => {
        const isExpanded = expandedIds.has(section.id)

        return (
          <article id={`section-card-${section.id}`} key={section.id} className="rounded-2xl border border-white/[0.08]" role="article" aria-label={formatTitle(section.title, i, section.notes, section.module)}>
            {/* Section Header */}
            <div
              onClick={() => toggleExpand(section.id)}
              className={`p-5 cursor-pointer hover:bg-white/[0.02] transition-colors bg-white/[0.02] rounded-t-2xl ${isExpanded ? "" : "rounded-b-2xl"}`}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={`notes-content-${section.id}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(section.id) } }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-400">
                    {i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg">{formatTitle(section.title, i, section.notes, section.module)}</h3>
                      {section.module && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          section.module === "Modül 1" 
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                            : "bg-violet-500/10 text-violet-400 border-violet-500/20"
                        }`}>
                          {section.module === "Modül 1" ? "📘" : "📗"} {section.module}
                        </span>
                      )}
                      {section.importance && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          section.importance === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          section.importance === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}>
                          {section.importance === "High" ? "🔴 Kritik" : section.importance === "Medium" ? "🟡 Önemli" : "🟢 Ek Bilgi"}
                        </span>
                      )}
                      {isAdmin && section.verificationScore != null && (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveScoreSection(section);
                          }}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1 ${
                            section.verificationScore === -1 ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                            section.verificationScore >= 95 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md shadow-emerald-950/20 hover:bg-emerald-500/20" :
                            section.verificationScore >= 70 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20" :
                            "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                          }`}
                        >
                          <>🔍 {section.verificationScore === -1 ? "Atlandı" : `%${section.verificationScore}`}</>
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full mt-1 inline-block">
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3 inline-block" /> PDF Sayfa {section.pageStart}-{section.pageEnd}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip content={currentBookmark?.sectionId === section.id ? "Yer imini kaldır" : "Burada kaldım 📌"}>
                    <button
                      onClick={(e) => handleBookmark(e, section.id, formatTitle(section.title, i, section.notes, section.module))}
                      className={`p-1.5 rounded-lg transition-all ${
                        currentBookmark?.sectionId === section.id
                          ? "bg-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/10"
                          : "hover:bg-white/5 text-slate-500 hover:text-amber-400"
                      }`}
                      aria-label="Yer imi"
                    >
                      {currentBookmark?.sectionId === section.id 
                        ? <BookmarkCheck className="w-4 h-4" />
                        : <Bookmark className="w-4 h-4" />
                      }
                    </button>
                  </Tooltip>
                  <ChevronRight className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </div>
            </div>

            {/* Section Content */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-6 border-t border-white/5 relative rounded-b-2xl"
                id={`notes-content-${section.id}`}
                onMouseUp={() => handleTextSelect(section.id, formatTitle(section.title, i, section.notes, section.module))}
              >
                {/* İşaretler bar */}
                {(sectionHighlights[section.id]?.length || 0) > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <Highlighter className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-xs font-bold text-slate-400">İşaretlerim ({sectionHighlights[section.id]?.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sectionHighlights[section.id]?.map(hl => (
                        <span
                          key={hl.id}
                          title={hl.note}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border cursor-help ${getColorClass(hl.color)}`}
                        >
                          <span className="max-w-[200px] truncate">{hl.selectedText}</span>
                          {hl.note && <span className="text-white/70">📝</span>}
                          <button
                            onClick={() => {
                              removeHighlight(hl.id)
                              setSectionHighlights(prev => ({
                                ...prev,
                                [section.id]: prev[section.id]?.filter(h => h.id !== hl.id) || []
                              }))
                              toast.success("İşaret kaldırıldı")
                            }}
                            className="ml-0.5 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-slate-300 leading-relaxed markdown-notes">
                  {section.notes ? (
                    <PremiumMarkdownRenderer 
                      content={cleanMarkdown(section.notes, true)}
                      renderTooltips={renderTooltips}
                      autoScrollKeyword={scrollKeyword}
                    />
                  ) : (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-center my-4">
                      <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-indigo-400" />
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-white mb-2">Bölüm Notları Hazırlanıyor...</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        Yapay zeka asistanımız bu bölümün ders notlarını, flashcard'larını ve sorularını otonom olarak şu an hazırlıyor. 
                        İşlem tamamlandığında burası otomatik olarak güncellenecektir.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </article>
        )
      })}

      {/* Highlight renk seçici popup */}
      {highlightPopup && (
        <div
          className="highlight-popup fixed z-50 flex flex-col gap-2 p-3 rounded-xl bg-slate-800 border border-white/10 shadow-2xl shadow-black/40 min-w-[240px]"
          style={{
            left: `${Math.min(highlightPopup.x, window.innerWidth - 240)}px`,
            top: `${highlightPopup.y + 10}px`,
          }}
        >
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-300">Renkli İşaretle & Not Ekle</span>
            <textarea 
              value={highlightNote}
              onChange={(e) => setHighlightNote(e.target.value)}
              placeholder="Bu kısım için bir not düş (isteğe bağlı)..."
              className="w-full h-16 bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[10px] text-slate-400">Renk seçerek kaydet:</span>
            <div className="flex items-center gap-1">
              {(["yellow", "green", "red", "blue"] as const).map(color => (
                <Tooltip key={color} content={color === "yellow" ? "Sarı" : color === "green" ? "Yeşil" : color === "red" ? "Kırmızı" : "Mavi"}>
                  <button
                    onClick={() => doHighlight(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${
                      color === "yellow" ? "bg-yellow-400 border-yellow-500" :
                      color === "green" ? "bg-emerald-400 border-emerald-500" :
                      color === "red" ? "bg-red-400 border-red-500" :
                      "bg-blue-400 border-blue-500"
                    }`}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
          <button 
            onClick={() => { setHighlightPopup(null); setHighlightNote(""); }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Puan, Kontrolör ve Müfettiş Detay Modalı (Admin Görünümü) */}
      {mounted && createPortal(
        <AnimatePresence>
          {isAdmin && activeScoreSection && (
            <SectionQualityModal
              section={activeScoreSection}
              onClose={() => setActiveScoreSection(null)}
              actions={(
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
                  {activeScoreSection.verificationScore === 100 ? null : (
                    <>
                      <button
                        disabled={isRefining || isApproving}
                        onClick={async () => {
                          setIsRefining(true);
                          try {
                            const { refineSectionNotesAction } = await import("@/lib/actions");
                            const res = await refineSectionNotesAction(activeScoreSection.id);
                            if (res.success && res.section) {
                              setActiveScoreSection(res.section);
                              toast.success("Yapay zeka eksikleri gidererek ders notlarını baştan yazdı!");
                              onReloadCourse?.();
                            } else {
                              toast.error("İyileştirme başarısız: " + (res.error || "Bilinmeyen hata"));
                            }
                          } catch (err: any) {
                            toast.error("Hata: " + err.message);
                          } finally {
                            setIsRefining(false);
                          }
                        }}
                        className={`flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold transition-all text-center text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-950/30 ${
                          isRefining || isApproving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        {isRefining ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> İyileştiriliyor...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Eksikleri Gider
                          </>
                        )}
                      </button>

                      <button
                        disabled={isRefining || isApproving}
                        onClick={async () => {
                          setIsApproving(true);
                          try {
                            const { approveSectionAction } = await import("@/lib/actions");
                            const res = await approveSectionAction(activeScoreSection.id);
                            if (res.success) {
                              toast.success("Bölüm başarıyla onaylandı!");
                              setActiveScoreSection(null);
                              onReloadCourse?.();
                              
                              // Arka plan işleme sürecini tekrar tetikle
                              fetch("/api/courses/process", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ slug }),
                              }).catch(err => {
                                console.error("[RESUME_BG_ERROR]", err);
                              });
                            } else {
                              toast.error("Onaylama başarısız: " + (res.error || "Bilinmeyen hata"));
                            }
                          } catch (err: any) {
                            toast.error("Hata: " + err.message);
                          } finally {
                            setIsApproving(false);
                          }
                        }}
                        className={`flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all text-center text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/30 ${
                          isRefining || isApproving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        {isApproving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Onaylanıyor...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" /> Onayla ve Devam Et
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  )
}


