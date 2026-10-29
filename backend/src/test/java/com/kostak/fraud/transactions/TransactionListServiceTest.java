package com.kostak.fraud.transactions;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionListServiceTest {

    private static final UUID TENANT_ID = UUID.fromString("a1111111-1111-4111-8111-111111111111");

    @Mock
    private TransactionListRepository repository;

    @InjectMocks
    private TransactionListService service;

    @Test
    void calculatesOffsetAndPageMetadataWithoutLoadingAllRows() {
        when(repository.count(TENANT_ID, TransactionChannel.WALLET)).thenReturn(101L);
        when(repository.findPage(TENANT_ID, TransactionChannel.WALLET, 50, 100L)).thenReturn(List.of());

        TransactionPageResponse response = service.list(TENANT_ID, TransactionChannel.WALLET, 2, 50);

        assertThat(response.page()).isEqualTo(2);
        assertThat(response.pageSize()).isEqualTo(50);
        assertThat(response.totalElements()).isEqualTo(101);
        assertThat(response.totalPages()).isEqualTo(3);
        verify(repository).count(TENANT_ID, TransactionChannel.WALLET);
        verify(repository).findPage(TENANT_ID, TransactionChannel.WALLET, 50, 100L);
    }

    @Test
    void rejectsInvalidBoundsAndOffsetOverflowBeforeQuerying() {
        assertThatThrownBy(() -> service.list(TENANT_ID, TransactionChannel.WALLET, -1, 50))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.list(TENANT_ID, TransactionChannel.WALLET, 0, 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.list(TENANT_ID, TransactionChannel.WALLET, 0, 101))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.list(
                TENANT_ID,
                TransactionChannel.WALLET,
                Long.MAX_VALUE,
                TransactionListService.MAX_PAGE_SIZE
        )).isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(repository);
    }
}
