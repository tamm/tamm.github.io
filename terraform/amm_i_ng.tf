# =============================================================================
# DNS Records for amm.i.ng (shortlinks domain)
# =============================================================================

variable "amm_i_ng_zone_id" {
  description = "Cloudflare zone ID for amm.i.ng"
  type        = string
  default     = "edb5db778c41a5bebd52fbfbeec23ea0"
}

# Root domain - points to Workers
resource "cloudflare_record" "amm_i_ng_root" {
  zone_id = var.amm_i_ng_zone_id
  name    = "amm.i.ng"
  content = "100::"
  type    = "AAAA"
  proxied = true
  ttl     = 1
}

# t.amm.i.ng subdomain - also for shortlinks
resource "cloudflare_record" "amm_i_ng_t" {
  zone_id = var.amm_i_ng_zone_id
  name    = "t"
  content = "100::"
  type    = "AAAA"
  proxied = true
  ttl     = 1
}
