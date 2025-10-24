export interface DualInvestmentProject {
  id: string;
  investmentAsset: string;
  targetAsset: string;
  underlying: string;
  strikePrice: string;
  duration: string;
  settleTime: string;
  canPurchase: boolean;
  apr: string;
  orderId: string;
  minDepositAmount: string;
  maxDepositAmount: string;
  type: "UP" | "DOWN";
  isAutoCompoundEnable: boolean;
  autoCompoundPlanList: any[];
  autoCompoundReverseEnabled: boolean;
  autoCompoundStepSize: string;
  autoCompoundUserConfigType: string;
  autoCompoundReverseActive: boolean;
  autoCompoundBaseApr: string;
  autoCompoundStrikePriceDifference: string;
  autoCompoundNextSettlementTime: string;
  autoCompoundDuration: string;
}

export interface DualInvestmentResponse {
  code: string;
  message: string | null;
  messageDetail: string | null;
  data: {
    total: string;
    list: DualInvestmentProject[];
  };
}

export interface DualInvestmentFilters {
  coins: string[];
  projectType: "UP" | "DOWN" | "ALL";
  duration: "ALL" | "1" | "3" | "7" | "15" | "15-30" | "30-60" | "60+";
  pageIndex: number;
  pageSize: number;
}

export async function fetchDualInvestmentProjects(
  filters: DualInvestmentFilters
): Promise<DualInvestmentResponse> {
  const { coins, projectType, duration, pageIndex, pageSize } = filters;

  // Build query parameters
  const params = new URLSearchParams();

  // Buy Low (DOWN): investmentAsset = USDC, targetAsset = selected coin
  // Sell High (UP): investmentAsset = selected coin, targetAsset = USDC
  if (projectType === "DOWN") {
    // Buy Low: investing USDC, target is crypto (buy crypto when price is low)
    params.append('investmentAsset', 'USDC');
    coins.forEach(coin => {
      params.append('targetAsset', coin);
    });
  } else {
    // Sell High: investing crypto, target is USDC (sell crypto when price is high)
    coins.forEach(coin => {
      params.append('investmentAsset', coin);
    });
    params.append('targetAsset', 'USDC');
  }

  // Add project type if not ALL
  if (projectType !== 'ALL') {
    params.append('projectType', projectType);
  }

  // Add sorting
  params.append('sortType', 'APY_DESC');

  // Add pagination
  params.append('pageIndex', pageIndex.toString());
  params.append('pageSize', pageSize.toString());

  // Add duration filters
  if (duration !== 'ALL') {
    switch (duration) {
      case '1':
        params.append('endDuration', '1');
        break;
      case '3':
        params.append('endDuration', '3');
        break;
      case '7':
        params.append('endDuration', '7');
        break;
      case '15':
        params.append('endDuration', '15');
        break;  
      case '15-30':
        params.append('beginDuration', '15');
        params.append('endDuration', '30');
        break;
      case '30-60':
        params.append('beginDuration', '31');
        params.append('endDuration', '60');
        break;
      case '60+':
        params.append('beginDuration', '61');
        break;
    }
  }

  try {
    // Use our local API route instead of calling Binance directly
    const response = await fetch(
      `/api/dual-investment?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Handle error response from our proxy
    if (data.error) {
      throw new Error(data.message || 'Failed to fetch dual investment data');
    }

    return data;
  } catch (error) {
    console.error('Error fetching dual investment projects:', error);
    throw error;
  }
}