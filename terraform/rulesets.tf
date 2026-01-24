# =============================================================================
# Cache Rules for tamm.in
# =============================================================================

resource "cloudflare_ruleset" "cache_rules" {
  zone_id = var.cloudflare_zone_id
  kind    = "zone"
  name    = "default"
  phase   = "http_request_cache_settings"

  rules {
    action      = "set_cache_settings"
    description = "Static assets long cache"
    enabled     = true
    expression  = "(ends_with(http.request.uri.path, \".webp\")) or (ends_with(http.request.uri.path, \".png\")) or (ends_with(http.request.uri.path, \".jpg\")) or (ends_with(http.request.uri.path, \".css\")) or (ends_with(http.request.uri.path, \".js\")) or (ends_with(http.request.uri.path, \".woff2\"))"

    action_parameters {
      cache = true
      browser_ttl {
        mode    = "override_origin"
        default = 31536000  # 1 year
      }
      edge_ttl {
        mode    = "override_origin"
        default = 2678400   # 31 days
      }
    }
  }
}
