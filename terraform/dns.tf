# =============================================================================
# DNS Records for tamm.in
# =============================================================================

# -----------------------------------------------------------------------------
# Site records - GitHub Pages
# -----------------------------------------------------------------------------

resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "tamm.in"
  content = "tamm.github.io"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "wildcard" {
  zone_id = var.cloudflare_zone_id
  name    = "*"
  content = "tamm.github.io"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

# Note: api.tamm.in AAAA record is managed by Cloudflare Workers (read-only)
# Note: MX, SPF, DKIM records are managed by Cloudflare Email Routing (read-only)

# -----------------------------------------------------------------------------
# Mailchimp DKIM
# -----------------------------------------------------------------------------

resource "cloudflare_record" "dkim_mailchimp_k2" {
  zone_id = var.cloudflare_zone_id
  name    = "k2._domainkey"
  content = "dkim2.mcsv.net"
  type    = "CNAME"
  proxied = false
  ttl     = 3600
}

resource "cloudflare_record" "dkim_mailchimp_k3" {
  zone_id = var.cloudflare_zone_id
  name    = "k3._domainkey"
  content = "dkim3.mcsv.net"
  type    = "CNAME"
  proxied = false
  ttl     = 3600
}
