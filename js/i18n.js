/* ============================================================
   PROREINIGUNG — i18n Language System
   Supported: de (Deutsch), fr (Français), en (English)
   ============================================================ */

const I18n = (() => {

  const translations = {
    de: {
      nav_home:'Startseite', nav_services:'Leistungen', nav_about:'Über uns',
      nav_blog:'Blog', nav_careers:'Karriere', nav_contact:'Kontakt',
      nav_login:'Anmelden', nav_quote:'Angebot anfragen',
      nav_overview:'Übersicht', nav_orders:'Aufträge', nav_teamchat:'Team Chat',
      nav_messages:'Nachrichten', nav_profile:'Mein Profil', nav_admin:'Admin Panel',
      nav_revenue:'Umsatz', nav_guest:'Gastanfragen', nav_candidates:'Kandidaturen',
      nav_logout:'Abmelden',
      btn_save:'Speichern', btn_cancel:'Abbrechen', btn_close:'Schließen',
      btn_send:'Absenden', btn_edit:'Bearbeiten', btn_delete:'Löschen',
      btn_download:'Herunterladen', btn_back:'Zurück', btn_reply:'Antworten',
      status_new:'Neu', status_active:'Aktiv', status_pending:'Ausstehend',
      status_done:'Abgeschlossen', status_cancelled:'Storniert',
      status_paid:'Bezahlt', status_invited:'Eingeladen',
      status_accepted:'Akzeptiert', status_rejected:'Abgelehnt',
      quote_title:'Angebot anfragen', quote_submit:'Anfrage absenden',
      quote_privacy:'Ich habe die Datenschutzerklärung gelesen und akzeptiere die Verarbeitung meiner Daten.',
      contact_submit:'Nachricht senden',
      dash_welcome:'Willkommen zurück', dash_new_order:'Neuer Auftrag',
      dash_orders:'Meine Aufträge', dash_invoices:'Rechnungen',
      invoice_download:'PDF herunterladen', invoice_paid:'Bezahlt', invoice_pending:'Ausstehend',
      footer_rights:'Alle Rechte vorbehalten.', footer_imprint:'Impressum',
      footer_privacy:'Datenschutz', footer_terms:'AGB',
      lang_de:'Deutsch', lang_fr:'Français', lang_en:'English',
    },
    fr: {
      nav_home:'Accueil', nav_services:'Services', nav_about:'À propos',
      nav_blog:'Blog', nav_careers:'Carrière', nav_contact:'Contact',
      nav_login:'Connexion', nav_quote:'Demander un devis',
      nav_overview:'Vue d\'ensemble', nav_orders:'Commandes', nav_teamchat:'Chat équipe',
      nav_messages:'Messages', nav_profile:'Mon profil', nav_admin:'Panneau admin',
      nav_revenue:'Chiffre d\'affaires', nav_guest:'Demandes invités',
      nav_candidates:'Candidatures', nav_logout:'Déconnexion',
      btn_save:'Enregistrer', btn_cancel:'Annuler', btn_close:'Fermer',
      btn_send:'Envoyer', btn_edit:'Modifier', btn_delete:'Supprimer',
      btn_download:'Télécharger', btn_back:'Retour', btn_reply:'Répondre',
      status_new:'Nouveau', status_active:'Actif', status_pending:'En attente',
      status_done:'Terminé', status_cancelled:'Annulé',
      status_paid:'Payé', status_invited:'Invité',
      status_accepted:'Accepté', status_rejected:'Refusé',
      quote_title:'Demander un devis', quote_submit:'Envoyer la demande',
      quote_privacy:'J\'ai lu la politique de confidentialité et accepte le traitement de mes données.',
      contact_submit:'Envoyer le message',
      dash_welcome:'Bon retour', dash_new_order:'Nouvelle commande',
      dash_orders:'Mes commandes', dash_invoices:'Factures',
      invoice_download:'Télécharger PDF', invoice_paid:'Payé', invoice_pending:'En attente',
      footer_rights:'Tous droits réservés.', footer_imprint:'Mentions légales',
      footer_privacy:'Confidentialité', footer_terms:'CGU',
      lang_de:'Deutsch', lang_fr:'Français', lang_en:'English',
    },
    en: {
      nav_home:'Home', nav_services:'Services', nav_about:'About Us',
      nav_blog:'Blog', nav_careers:'Careers', nav_contact:'Contact',
      nav_login:'Sign In', nav_quote:'Request a Quote',
      nav_overview:'Overview', nav_orders:'Orders', nav_teamchat:'Team Chat',
      nav_messages:'Messages', nav_profile:'My Profile', nav_admin:'Admin Panel',
      nav_revenue:'Revenue', nav_guest:'Guest Requests',
      nav_candidates:'Applications', nav_logout:'Sign Out',
      btn_save:'Save', btn_cancel:'Cancel', btn_close:'Close',
      btn_send:'Send', btn_edit:'Edit', btn_delete:'Delete',
      btn_download:'Download', btn_back:'Back', btn_reply:'Reply',
      status_new:'New', status_active:'Active', status_pending:'Pending',
      status_done:'Completed', status_cancelled:'Cancelled',
      status_paid:'Paid', status_invited:'Invited',
      status_accepted:'Accepted', status_rejected:'Rejected',
      quote_title:'Request a Quote', quote_submit:'Submit Request',
      quote_privacy:'I have read the privacy policy and accept the processing of my data.',
      contact_submit:'Send Message',
      dash_welcome:'Welcome back', dash_new_order:'New Order',
      dash_orders:'My Orders', dash_invoices:'Invoices',
      invoice_download:'Download PDF', invoice_paid:'Paid', invoice_pending:'Pending',
      footer_rights:'All rights reserved.', footer_imprint:'Imprint',
      footer_privacy:'Privacy Policy', footer_terms:'Terms',
      lang_de:'Deutsch', lang_fr:'Français', lang_en:'English',
    }
  };

  const STORAGE_KEY = 'proreinigung_lang';
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'de';

  const t = (key) => {
    return (translations[currentLang] || translations.de)[key]
        || translations.de[key] || key;
  };

  const apply = () => {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else {
        // Preserve child elements (icons, SVGs, badges) — only replace first text node
        let replaced = false;
        for (const node of el.childNodes) {
          if (node.nodeType === 3 && node.textContent.trim()) {
            node.textContent = val + ' ';
            replaced = true;
            break;
          }
        }
        if (!replaced && el.children.length === 0) el.textContent = val;
      }
    });
    document.documentElement.lang = currentLang;
    document.querySelectorAll('.lang-option').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.lang === currentLang));
    document.querySelectorAll('.lang-current').forEach(el =>
      el.textContent = currentLang.toUpperCase());
  };

  const setLang = (lang) => {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    apply();
  };

  const injectSwitcher = () => {
    document.querySelectorAll('.lang-switcher').forEach(container => {
      if (container.querySelector('.lang-toggle')) return; // already injected
      container.innerHTML = `
        <div class="lang-switcher-inner" style="position:relative;display:inline-flex">
          <button class="lang-toggle" title="Sprache / Langue / Language">
            <span class="lang-current">${currentLang.toUpperCase()}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="lang-dropdown" style="display:none;position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.18);overflow:hidden;z-index:10000;min-width:145px">
            <button class="lang-option" data-lang="de">🇩🇪 Deutsch</button>
            <button class="lang-option" data-lang="fr">🇫🇷 Français</button>
            <button class="lang-option" data-lang="en">🇬🇧 English</button>
          </div>
        </div>`;

      const toggle   = container.querySelector('.lang-toggle');
      const dropdown = container.querySelector('.lang-dropdown');

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
      });

      container.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', () => {
          setLang(btn.dataset.lang);
          dropdown.style.display = 'none';
        });
      });

      document.addEventListener('click', () => { dropdown.style.display = 'none'; });

      // Highlight current
      container.querySelectorAll('.lang-option').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.lang === currentLang));
    });
  };

  const injectCSS = () => {
    if (document.getElementById('i18n-style')) return;
    const s = document.createElement('style');
    s.id = 'i18n-style';
    s.textContent = `
      .lang-toggle {
        display:flex;align-items:center;gap:5px;padding:6px 12px;
        border:1.5px solid rgba(255,255,255,.35);border-radius:999px;
        background:rgba(255,255,255,.12);color:#fff;cursor:pointer;
        font-size:.8rem;font-weight:700;transition:.2s;font-family:inherit;
      }
      .lang-toggle:hover{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.6)}
      .lang-option {
        display:flex;align-items:center;gap:8px;width:100%;
        padding:10px 14px;background:none;border:none;font-size:.85rem;
        font-weight:600;color:#374151;cursor:pointer;text-align:left;
        transition:.15s;font-family:inherit;border-bottom:1px solid #f1f5f9;
      }
      .lang-option:last-child{border-bottom:none}
      .lang-option:hover{background:#f8fafc;color:#1e40af}
      .lang-option.active{background:#eff6ff;color:#1e40af;font-weight:800}
    `;
    document.head.appendChild(s);
  };

  const init = () => {
    injectCSS();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { injectSwitcher(); apply(); });
    } else {
      injectSwitcher(); apply();
    }
  };

  init();

  return { t, setLang, apply, get lang() { return currentLang; } };
})();

window.I18n = I18n;
window.__ = I18n.t;
