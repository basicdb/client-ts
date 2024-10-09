type BasicSyncType = {
    basic_schema: any;
    connect: (options: { access_token: string }) => void;
    debugeroo: () => void;
    collection: (name: string) => {
      ref: {
        toArray: () => Promise<any[]>;
        count: () => Promise<number>;
      };
    };
    [key: string]: any; // For other potential methods and properties
  };

export type { BasicSyncType }