(() => {
  const MOCK_DEFAULT_SORT_MODE = "last_viewed";

  window.createMockSupabase = function createMockSupabase() {
    const state = createMockDatabase();
    const authListeners = new Set();
    let currentSession = {
      user: state.users[0],
    };

    const emitAuthStateChange = (event) => {
      for (const listener of authListeners) {
        listener(event, currentSession);
      }
    };

    const ensureMockUser = (email, displayName = "Mock User") => {
      const normalizedEmail = email.toLowerCase();
      let user = state.users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
      if (!user) {
        user = {
          id: `mock-user-${state.users.length + 1}`,
          email,
          user_metadata: { display_name: displayName },
        };
        state.users.push(user);
      }

      const existingProfile = state.profiles.find((profile) => profile.id === user.id);
      if (!existingProfile) {
        const now = new Date().toISOString();
        state.profiles.push({
          id: user.id,
          display_name: displayName,
          email,
          preferred_song_sort: MOCK_DEFAULT_SORT_MODE,
          created_at: now,
          updated_at: now,
        });
      }

      return user;
    };

    const getTableRows = (tableName) => {
      if (tableName === "profiles") {
        return state.profiles;
      }
      return state.tables[tableName] || [];
    };

    const setTableRows = (tableName, rows) => {
      if (tableName === "profiles") {
        state.profiles = rows;
        return;
      }
      state.tables[tableName] = rows;
    };

    const clone = (value) =>
      typeof structuredClone === "function"
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));

    class MockQueryBuilder {
      constructor(tableName) {
        this.tableName = tableName;
        this.action = "select";
        this.payload = null;
        this.filters = [];
        this.orders = [];
        this.expectSingle = false;
      }

      select() {
        return this;
      }

      insert(payload) {
        this.action = "insert";
        this.payload = payload;
        return this;
      }

      update(payload) {
        this.action = "update";
        this.payload = payload;
        return this;
      }

      delete() {
        this.action = "delete";
        return this;
      }

      upsert(payload) {
        this.action = "upsert";
        this.payload = payload;
        return this;
      }

      eq(column, value) {
        this.filters.push({ column, value });
        return this;
      }

      order(column, options = {}) {
        this.orders.push({
          column,
          ascending: options.ascending !== false,
        });
        return this;
      }

      single() {
        this.expectSingle = true;
        return this;
      }

      then(resolve, reject) {
        return this.execute().then(resolve, reject);
      }

      async execute() {
        try {
          const data = this.run();
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }

      run() {
        const now = new Date().toISOString();
        const rows = getTableRows(this.tableName);
        const matchesFilters = (row) =>
          this.filters.every(({ column, value }) => String(row[column]) === String(value));

        if (this.action === "select") {
          let result = rows.filter(matchesFilters).map((row) => clone(row));
          result = applyMockOrdering(result, this.orders);
          return this.expectSingle ? expectSingleRow(result, this.tableName) : result;
        }

        if (this.action === "insert") {
          const inputs = Array.isArray(this.payload) ? this.payload : [this.payload];
          const inserted = inputs.map((input) => {
            const record = clone(input);
            if (!record.id) {
              record.id = createMockId(this.tableName);
            }
            if (!record.created_at) {
              record.created_at = now;
            }
            if (!record.updated_at) {
              record.updated_at = now;
            }
            if (this.tableName === "profiles") {
              record.display_name = record.display_name || "Piano Player";
            }
            rows.push(record);
            return clone(record);
          });
          return this.expectSingle ? expectSingleRow(inserted, this.tableName) : inserted;
        }

        if (this.action === "update") {
          const updated = [];
          const nextRows = rows.map((row) => {
            if (!matchesFilters(row)) {
              return row;
            }
            const nextRow = {
              ...row,
              ...clone(this.payload),
              updated_at: now,
            };
            updated.push(clone(nextRow));
            return nextRow;
          });
          setTableRows(this.tableName, nextRows);
          return this.expectSingle ? expectSingleRow(updated, this.tableName) : updated;
        }

        if (this.action === "delete") {
          const keptRows = [];
          const deleted = [];
          for (const row of rows) {
            if (matchesFilters(row)) {
              deleted.push(clone(row));
            } else {
              keptRows.push(row);
            }
          }
          setTableRows(this.tableName, keptRows);
          return this.expectSingle ? expectSingleRow(deleted, this.tableName) : deleted;
        }

        if (this.action === "upsert") {
          const inputs = Array.isArray(this.payload) ? this.payload : [this.payload];
          const upserted = [];
          for (const input of inputs) {
            const record = clone(input);
            if (!record.id) {
              record.id = createMockId(this.tableName);
            }
            const index = rows.findIndex((row) => row.id === record.id);
            const nextRecord = {
              ...(index === -1 ? {} : rows[index]),
              ...record,
              created_at: record.created_at || rows[index]?.created_at || now,
              updated_at: now,
            };
            if (index === -1) {
              rows.push(nextRecord);
            } else {
              rows[index] = nextRecord;
            }
            upserted.push(clone(nextRecord));
          }
          return this.expectSingle ? expectSingleRow(upserted, this.tableName) : upserted;
        }

        throw new Error(`Unsupported mock operation: ${this.action}`);
      }
    }

    return {
      auth: {
        onAuthStateChange(callback) {
          authListeners.add(callback);
          return {
            data: {
              subscription: {
                unsubscribe() {
                  authListeners.delete(callback);
                },
              },
            },
          };
        },
        async getSession() {
          return { data: { session: currentSession }, error: null };
        },
        async signUp({ email, options = {} }) {
          const user = ensureMockUser(email, options.data?.display_name || "Mock User");
          currentSession = { user };
          emitAuthStateChange("SIGNED_IN");
          return { data: { session: currentSession }, error: null };
        },
        async signInWithPassword({ email }) {
          const user = ensureMockUser(email, email.split("@")[0] || "Mock User");
          currentSession = { user };
          emitAuthStateChange("SIGNED_IN");
          return { data: { session: currentSession }, error: null };
        },
        async signOut() {
          currentSession = null;
          emitAuthStateChange("SIGNED_OUT");
          return { error: null };
        },
      },
      from(tableName) {
        return new MockQueryBuilder(tableName);
      },
    };
  };

  function createMockDatabase() {
    const now = Date.now();
    const stamp = (msOffset) => new Date(now - msOffset).toISOString();

    return {
      users: [
        {
          id: "mock-user-1",
          email: "demo@example.com",
          user_metadata: { display_name: "Demo User" },
        },
      ],
      profiles: [
        {
          id: "mock-user-1",
          display_name: "Demo User",
          email: "demo@example.com",
          preferred_song_sort: MOCK_DEFAULT_SORT_MODE,
          created_at: stamp(5 * 60 * 1000),
          updated_at: stamp(2 * 60 * 1000),
        },
      ],
      tables: {
        songs: [
          {
            id: "mock-song-1",
            user_id: "mock-user-1",
            title: "Demo Song",
            artist: "Demo Artist",
            original_key: "C",
            saved_transpose: 0,
            saved_key: "C",
            content: "C\nDemo lyric line",
            created_at: stamp(8 * 60 * 1000),
            updated_at: stamp(3 * 60 * 1000),
            last_viewed_at: stamp(90 * 1000),
          },
          {
            id: "mock-song-2",
            user_id: "mock-user-1",
            title: "Second Song",
            artist: "Another Artist",
            original_key: "G",
            saved_transpose: 0,
            saved_key: "G",
            content: "G\nSecond lyric line",
            created_at: stamp(7 * 60 * 1000),
            updated_at: stamp(4 * 60 * 1000),
            last_viewed_at: stamp(4 * 60 * 1000),
          },
        ],
        setlists: [
          {
            id: "mock-setlist-1",
            user_id: "mock-user-1",
            name: "Sunday Set",
            created_at: stamp(6 * 60 * 1000),
            updated_at: stamp(75 * 1000),
          },
          {
            id: "mock-setlist-2",
            user_id: "mock-user-1",
            name: "Rehearsal Set",
            created_at: stamp(5 * 60 * 1000),
            updated_at: stamp(2 * 60 * 1000),
          },
        ],
        setlist_items: [
          {
            id: "mock-item-1",
            setlist_id: "mock-setlist-1",
            song_id: "mock-song-1",
            position: 0,
            created_at: stamp(5 * 60 * 1000),
          },
          {
            id: "mock-item-2",
            setlist_id: "mock-setlist-1",
            song_id: "mock-song-2",
            position: 1,
            created_at: stamp(4 * 60 * 1000),
          },
          {
            id: "mock-item-3",
            setlist_id: "mock-setlist-2",
            song_id: "mock-song-2",
            position: 0,
            created_at: stamp(4 * 60 * 1000),
          },
        ],
      },
    };
  }

  function createMockId(tableName) {
    return `${tableName.slice(0, -1)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function applyMockOrdering(rows, orders) {
    if (!orders.length) {
      return rows;
    }

    return rows.sort((left, right) => {
      for (const { column, ascending } of orders) {
        const leftValue = left[column] ?? "";
        const rightValue = right[column] ?? "";
        if (leftValue < rightValue) {
          return ascending ? -1 : 1;
        }
        if (leftValue > rightValue) {
          return ascending ? 1 : -1;
        }
      }
      return 0;
    });
  }

  function expectSingleRow(rows, tableName) {
    if (rows.length === 1) {
      return rows[0];
    }

    if (rows.length === 0) {
      throw new Error(`No rows returned from mock ${tableName}`);
    }

    throw new Error(`Multiple rows returned from mock ${tableName}`);
  }
})();
