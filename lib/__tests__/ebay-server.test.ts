/**
 * Tests for lib/ebay-server.ts
 * Tests eBay API integration with mocked fetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment
vi.stubEnv('EBAY_APP_ID', '');
vi.stubEnv('EBAY_CERT_ID', '');
vi.stubEnv('EBAY_DEV_ID', '');
vi.stubEnv('EBAY_SANDBOX', 'false');

import { isEbayConfigured, getEbayStatus, searchListings, getSoldComparables } from '../ebay-server';

describe('ebay-server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isEbayConfigured', () => {
    it('returns false when EBAY_APP_ID is empty', () => {
      vi.stubEnv('EBAY_APP_ID', '');
      expect(isEbayConfigured()).toBe(false);
    });

    it('returns true when EBAY_APP_ID is set', () => {
      vi.stubEnv('EBAY_APP_ID', 'test-app-id');
      expect(isEbayConfigured()).toBe(true);
      vi.stubEnv('EBAY_APP_ID', '');
    });
  });

  describe('getEbayStatus', () => {
    it('returns not configured when no app ID', () => {
      vi.stubEnv('EBAY_APP_ID', '');
      const status = getEbayStatus();
      expect(status.configured).toBe(false);
      expect(status.message).toContain('not configured');
    });

    it('returns configured with production message', () => {
      vi.stubEnv('EBAY_APP_ID', 'test-id');
      vi.stubEnv('EBAY_SANDBOX', 'false');
      const status = getEbayStatus();
      expect(status.configured).toBe(true);
      expect(status.sandbox).toBe(false);
      expect(status.message).toContain('Production');
      vi.stubEnv('EBAY_APP_ID', '');
    });

    it('returns configured with sandbox message', () => {
      vi.stubEnv('EBAY_APP_ID', 'test-id');
      vi.stubEnv('EBAY_SANDBOX', 'true');
      const status = getEbayStatus();
      expect(status.configured).toBe(true);
      expect(status.sandbox).toBe(true);
      expect(status.message).toContain('Sandbox');
      vi.stubEnv('EBAY_APP_ID', '');
    });
  });

  describe('searchListings', () => {
    it('throws when eBay is not configured', async () => {
      vi.stubEnv('EBAY_APP_ID', '');
      await expect(
        searchListings({ keywords: 'laptop', page: 1, perPage: 12 })
      ).rejects.toThrow('not configured');
    });

    it('returns parsed listings on success', async () => {
      vi.stubEnv('EBAY_APP_ID', 'test-app-id');
      const mockResponse = {
        findItemsByKeywordsResponse: [{
          ack: ['Success'],
          searchResult: [{
            '@count': '1',
            item: [{
              itemId: ['12345'],
              title: ['Test Laptop'],
              sellingStatus: [{ currentPrice: [{ __value__: '199.99', '@currencyId': 'USD' }], sellingState: ['Active'] }],
              condition: [{ conditionId: ['3000'], conditionDisplayName: ['Good'] }],
              listingInfo: [{ startTime: ['2026-01-01T00:00:00Z'], listingType: ['FixedPrice'] }],
              sellerInfo: [{ sellerUserName: ['seller1'], feedbackScore: ['100'], positiveFeedbackPercent: ['99.5'], topRatedSeller: ['true'] }],
              primaryCategory: [{ categoryId: ['175672'], categoryName: ['Laptops'] }],
              viewItemURL: ['https://www.ebay.com/itm/12345'],
              galleryURL: ['https://i.ebayimg.com/images/g/test/s-l140.jpg'],
              location: ['New York, NY'],
            }],
          }],
          paginationOutput: [{ pageNumber: ['1'], totalPages: ['1'] }],
        }],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await searchListings({ keywords: 'laptop', page: 1, perPage: 12 });
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].id).toBe('12345');
      expect(result.listings[0].title).toBe('Test Laptop');
      expect(result.listings[0].currentPrice).toBe(199.99);
      expect(result.listings[0].condition).toBe('good');
      expect(result.listings[0].seller.riskLevel).toBe('low');

      vi.stubEnv('EBAY_APP_ID', '');
    });

    it('handles empty search results', async () => {
      vi.stubEnv('EBAY_APP_ID', 'test-app-id');
      const mockResponse = {
        findItemsByKeywordsResponse: [{
          ack: ['Success'],
          searchResult: [{ '@count': '0' }],
          paginationOutput: [{ pageNumber: ['1'], totalPages: ['0'] }],
        }],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await searchListings({ keywords: 'nonexistent', page: 1, perPage: 12 });
      expect(result.listings).toHaveLength(0);
      expect(result.total).toBe(0);

      vi.stubEnv('EBAY_APP_ID', '');
    });

    it('throws on HTTP error', async () => {
      vi.stubEnv('EBAY_APP_ID', 'test-app-id');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Server Error', { status: 500 })
      );

      await expect(
        searchListings({ keywords: 'laptop', page: 1, perPage: 12 })
      ).rejects.toThrow('HTTP Error: 500');

      vi.stubEnv('EBAY_APP_ID', '');
    });
  });

  describe('getSoldComparables', () => {
    it('throws when eBay is not configured', async () => {
      vi.stubEnv('EBAY_APP_ID', '');
      await expect(getSoldComparables('macbook')).rejects.toThrow('not configured');
    });

    it('returns sorted comparables on success', async () => {
      vi.stubEnv('EBAY_APP_ID', 'test-app-id');
      const mockResponse = {
        findCompletedItemsResponse: [{
          ack: ['Success'],
          searchResult: [{
            '@count': '2',
            item: [
              {
                itemId: ['111'],
                title: ['MacBook Pro 2023'],
                sellingStatus: [{ currentPrice: [{ __value__: '800', '@currencyId': 'USD' }] }],
                condition: [{ conditionId: ['3000'] }],
                listingInfo: [{ endTime: ['2026-01-05T00:00:00Z'] }],
              },
              {
                itemId: ['222'],
                title: ['MacBook Pro M2'],
                sellingStatus: [{ currentPrice: [{ __value__: '900', '@currencyId': 'USD' }] }],
                condition: [{ conditionId: ['1000'] }],
                listingInfo: [{ endTime: ['2026-01-10T00:00:00Z'] }],
              },
            ],
          }],
        }],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await getSoldComparables('macbook', { daysBack: 30 });
      expect(result).toHaveLength(2);
      // Sorted by date descending — item 222 (Jan 10) first
      expect(result[0].id).toBe('222');
      expect(result[1].id).toBe('111');

      vi.stubEnv('EBAY_APP_ID', '');
    });
  });
});
