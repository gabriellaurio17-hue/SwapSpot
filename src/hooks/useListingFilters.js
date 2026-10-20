import { useMemo } from 'react';

function useListingFilters(listings, category, keyword, under500) {
  return useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return listings.filter((listing) => {
      const categoryMatch = category === 'All' || listing.category === category;
      const keywordMatch = !query || `${listing.title} ${listing.category} ${listing.condition}`.toLowerCase().includes(query);
      return categoryMatch && keywordMatch && (!under500 || listing.under500);
    });
  }, [listings, category, keyword, under500]);
}

export default useListingFilters;