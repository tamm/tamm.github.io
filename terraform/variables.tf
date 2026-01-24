variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions to manage tamm.in zone"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for tamm.in"
  type        = string
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "tamm.in"
}
